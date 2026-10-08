/**
 * DashboardService.js
 * 成果ダッシュボードの集計(架電履歴・見込み客から計算する)。
 */

/** 期間の種類 */
const PERIOD = {
  TODAY: 'today',
  WEEK: 'week',   // 今週(月曜はじまり)
  MONTH: 'month', // 今月
};

/** 「今日」を選んだときの推移グラフの日数 */
const TREND_DAYS_FOR_TODAY = 7;

/**
 * ダッシュボードのデータを作る
 * 営業は自分の数字のみ。マネージャーは全員(または ownerFilter の担当者)と担当者別の比較。
 * @param {{name: string, role: string}} staff
 * @param {string} period PERIOD の値
 * @param {string} ownerFilter マネージャーの担当者絞り込み(空なら全員)
 * @return {Object}
 */
function buildDashboard_(staff, period, ownerFilter) {
  const isManager = staff.role === ROLE.MANAGER;
  const owner = isManager ? (ownerFilter || '') : staff.name;
  const range = periodRange_(period, new Date());

  const rows = getHistoryRowsForDashboard_();
  const inScope = function (r) { return !owner || r.owner === owner; };
  const inPeriod = rows.filter(function (r) { return inScope(r) && r.date >= range.start && r.date <= range.end; });

  const result = {
    period: range.period,
    periodLabel: range.label,
    rangeText: range.start === range.end ? range.start : range.start + ' 〜 ' + range.end,
    isManager: isManager,
    owner: owner,
    metrics: summarize_(inPeriod),
    trend: buildTrend_(rows.filter(inScope), range.trendStart, range.end),
    trendLabel: range.period === PERIOD.TODAY ? '直近' + TREND_DAYS_FOR_TODAY + '日' : range.label,
    statusMix: buildStatusMix_(staff, owner),
    rebuttals: buildRebuttalCounts_(inPeriod),
    byOwner: [],
  };

  if (isManager) {
    // 担当者別の比較は、絞り込みに関係なく営業全員を並べる
    const sales = getStaffList_().filter(function (s) { return s.role === ROLE.SALES; });
    const allInPeriod = rows.filter(function (r) { return r.date >= range.start && r.date <= range.end; });
    result.byOwner = sales.map(function (s) {
      const m = summarize_(allInPeriod.filter(function (r) { return r.owner === s.name; }));
      m.name = s.name;
      return m;
    }).sort(function (a, b) {
      return b.won - a.won || b.winRate - a.winRate || b.calls - a.calls;
    });
    result.byOwner.forEach(function (m, i) { m.rank = i + 1; });
  }
  return result;
}

/**
 * 期間の開始日・終了日(yyyy-MM-dd)を求める
 * @param {string} period
 * @param {Date} now
 * @return {{period: string, label: string, start: string, end: string, trendStart: string}}
 */
function periodRange_(period, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const fmt = function (d) { return formatDate_(d, 'yyyy-MM-dd'); };
  const addDays = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  const end = fmt(today);

  if (period === PERIOD.WEEK) {
    const fromMonday = (today.getDay() + 6) % 7; // 月曜=0 … 日曜=6
    const start = fmt(addDays(today, -fromMonday));
    return { period: PERIOD.WEEK, label: '今週', start: start, end: end, trendStart: start };
  }
  if (period === PERIOD.MONTH) {
    const start = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
    return { period: PERIOD.MONTH, label: '今月', start: start, end: end, trendStart: start };
  }
  return { period: PERIOD.TODAY, label: '今日', start: end, end: end, trendStart: fmt(addDays(today, -(TREND_DAYS_FOR_TODAY - 1))) };
}

/**
 * 架電履歴を集計しやすい形で読む
 * @return {{date: string, owner: string, result: string, rebuttal: string}[]}
 */
function getHistoryRowsForDashboard_() {
  const sheet = getSheet_(SHEET.CALL_HISTORY);
  if (sheet.getLastRow() < 2) return [];
  const H = COL.HISTORY;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.CALL_HISTORY].length).getValues()
    .filter(function (r) { return r[H.ID] !== '' && r[H.DATETIME] instanceof Date; })
    .map(function (r) {
      return {
        date: formatDate_(r[H.DATETIME], 'yyyy-MM-dd'),
        owner: String(r[H.OWNER]),
        result: String(r[H.RESULT]),
        rebuttal: String(r[H.REBUTTAL]).trim(),
      };
    });
}

/**
 * 指標を計算する
 * 接続数 = 不在以外の架電、成約率 = 成約数 ÷ 接続数
 * @param {Object[]} rows
 * @return {{calls: number, connected: number, prospect: number, material: number, won: number, winRate: number}}
 */
function summarize_(rows) {
  const count = function (status) { return rows.filter(function (r) { return r.result === status; }).length; };
  const calls = rows.length;
  const connected = calls - count(STATUS.ABSENT);
  const won = count(STATUS.WON);
  return {
    calls: calls,
    connected: connected,
    prospect: count(STATUS.PROSPECT),
    material: count(STATUS.MATERIAL_SENT),
    won: won,
    winRate: connected ? Math.round(won / connected * 1000) / 10 : 0,
  };
}

/**
 * 日別の架電数と成約数(土日も含めて日付を並べる)
 * @param {Object[]} rows 担当者で絞り込み済みの履歴
 * @param {string} start yyyy-MM-dd
 * @param {string} end yyyy-MM-dd
 * @return {{dates: string[], calls: number[], won: number[]}}
 */
function buildTrend_(rows, start, end) {
  const dates = [];
  const p = start.split('-').map(Number);
  for (let d = new Date(p[0], p[1] - 1, p[2]); formatDate_(d, 'yyyy-MM-dd') <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate_(d, 'yyyy-MM-dd'));
  }
  const calls = {};
  const won = {};
  rows.forEach(function (r) {
    if (r.date < start || r.date > end) return;
    calls[r.date] = (calls[r.date] || 0) + 1;
    if (r.result === STATUS.WON) won[r.date] = (won[r.date] || 0) + 1;
  });
  return {
    dates: dates,
    calls: dates.map(function (d) { return calls[d] || 0; }),
    won: dates.map(function (d) { return won[d] || 0; }),
  };
}

/**
 * 現在の見込み客リストのステータス構成(期間に関係なく、今の状態)
 * @param {{name: string, role: string}} staff
 * @param {string} owner 担当者の絞り込み(空なら staff が見られる全件)
 * @return {{status: string, count: number}[]}
 */
function buildStatusMix_(staff, owner) {
  const prospects = getProspectsFor_(staff).filter(function (p) { return !owner || p.owner === owner; });
  return STATUS_LIST.map(function (status) {
    return { status: status, count: prospects.filter(function (p) { return p.status === status; }).length };
  });
}

/**
 * 断り文句の分類別の発生件数(多い順。切り返し集の全分類を0件も含めて返す)
 * @param {Object[]} rows 期間内の履歴
 * @return {{category: string, count: number}[]}
 */
function buildRebuttalCounts_(rows) {
  const counts = {};
  getRebuttals_().forEach(function (r) { counts[r.category] = 0; });
  rows.forEach(function (r) {
    if (r.rebuttal) counts[r.rebuttal] = (counts[r.rebuttal] || 0) + 1;
  });
  return Object.keys(counts)
    .map(function (k) { return { category: k, count: counts[k] }; })
    .sort(function (a, b) { return b.count - a.count; });
}
