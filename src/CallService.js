/**
 * CallService.js
 * 架電履歴の取得と、架電結果の保存。
 */

/** 架電モードに表示する過去の履歴の最大件数 */
const CALL_HISTORY_LIMIT = 20;

/**
 * 架電履歴の1行を画面用のオブジェクトに変換する
 * @param {Array} r
 * @return {Object}
 */
function historyToObject_(r) {
  const H = COL.HISTORY;
  return {
    id: String(r[H.ID]),
    datetime: formatDate_(r[H.DATETIME], 'yyyy-MM-dd HH:mm'),
    prospectId: String(r[H.PROSPECT_ID]),
    company: String(r[H.COMPANY]),
    owner: String(r[H.OWNER]),
    result: String(r[H.RESULT]),
    memo: String(r[H.MEMO]),
    rebuttal: String(r[H.REBUTTAL]),
  };
}

/**
 * 見込み客の過去の架電履歴を新しい順に取得する
 * @param {string} prospectId
 * @return {Object[]}
 */
function getCallHistory_(prospectId) {
  const sheet = getSheet_(SHEET.CALL_HISTORY);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.CALL_HISTORY].length).getValues()
    .filter(function (r) { return String(r[COL.HISTORY.PROSPECT_ID]) === prospectId; })
    .map(historyToObject_)
    .sort(function (a, b) { return a.datetime < b.datetime ? 1 : -1; })
    .slice(0, CALL_HISTORY_LIMIT);
}

/**
 * 架電結果を保存する
 * 見込み客のステータス・リスト区分・架電回数・最終架電日時・次回架電日を更新し、架電履歴に1行追加する。
 * 2つのシートの更新をまとめて排他制御する。
 * @param {{prospectId: string, staffName: string, status: string, memo: string, nextCallDate: string, rebuttal: string}} input
 * @return {{prospect: Object, history: Object}}
 */
function saveCallResult_(input) {
  const status = String(input.status || '');
  if (STATUS_LIST.indexOf(status) === -1 || status === STATUS.NOT_CALLED) {
    throw new Error('結果のステータスを選んでください。');
  }
  const nextCallDate = parseDateInput_(input.nextCallDate);
  if (STATUS_REQUIRES_NEXT_DATE.indexOf(status) !== -1 && !nextCallDate) {
    throw new Error('「' + status + '」の場合は次回架電日を入力してください。');
  }
  return withLock_(function () {
    return recordCall_({
      prospectId: input.prospectId,
      staffName: input.staffName,
      status: status,
      memo: String(input.memo || '').trim(),
      nextCallDate: nextCallDate,
      rebuttal: String(input.rebuttal || '').trim(),
    });
  });
}

/**
 * 1回の架電を記録する(排他制御の中で呼ぶこと)
 * @param {{prospectId: string, staffName: string, status: string, memo: string, nextCallDate: Date|null, rebuttal: string}} rec
 * @return {{prospect: Object, history: Object}}
 */
function recordCall_(rec) {
  const now = new Date();
  const prospect = applyProspectUpdate_(rec.prospectId, function (current) {
    return {
      STATUS: rec.status,
      CALL_COUNT: current.callCount + 1,
      LAST_CALLED_AT: now,
      // 成約・NG は次回架電日を消す。資料送付済みは入力があれば保存する
      NEXT_CALL_DATE: rec.status === STATUS.WON || rec.status === STATUS.NG ? '' : (rec.nextCallDate || ''),
    };
  });

  const row = [nextHistoryId_(), now, prospect.id, prospect.company, rec.staffName, rec.status, rec.memo, rec.rebuttal];
  getSheet_(SHEET.CALL_HISTORY).appendRow(row);
  SpreadsheetApp.flush();
  return { prospect: prospect, history: historyToObject_(row) };
}

/**
 * 保存済みの架電履歴1行を書き換える(排他制御の中で呼ぶこと)
 * 架電結果を保存した後に資料を送ったときに使う(1回の電話は1行にまとめる)。
 * @param {string} historyId
 * @param {function(Object): Object<string, *>} makeFields 現在の履歴を受け取り、更新する項目(COL.HISTORY のキー名)を返す関数
 * @return {Object} 更新後の履歴
 */
function updateHistoryRow_(historyId, makeFields) {
  const sheet = getSheet_(SHEET.CALL_HISTORY);
  const ids = sheet.getLastRow() >= 2
    ? sheet.getRange(2, COL.HISTORY.ID + 1, sheet.getLastRow() - 1, 1).getValues()
    : [];
  // 直近の行ほど後ろにあるので、後ろから探す
  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) !== historyId) continue;
    const range = sheet.getRange(i + 2, 1, 1, HEADERS[SHEET.CALL_HISTORY].length);
    const values = range.getValues()[0];
    const fields = makeFields(historyToObject_(values));
    Object.keys(fields).forEach(function (key) { values[COL.HISTORY[key]] = fields[key]; });
    range.setValues([values]);
    return historyToObject_(values);
  }
  throw new Error('架電履歴「' + historyId + '」が見つかりません。');
}

/**
 * 次の履歴ID(HIS-00001 形式)を作る(排他制御の中で呼ぶこと)
 * @return {string}
 */
function nextHistoryId_() {
  const sheet = getSheet_(SHEET.CALL_HISTORY);
  let max = 0;
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, COL.HISTORY.ID + 1, sheet.getLastRow() - 1, 1).getValues().forEach(function (r) {
      const n = Number(String(r[0]).replace(ID_PREFIX.HISTORY, ''));
      if (n > max) max = n;
    });
  }
  return ID_PREFIX.HISTORY + String(max + 1).padStart(5, '0');
}

/**
 * 画面から届いた日付(yyyy-MM-dd)を Date にする
 * @param {string} value
 * @return {Date|null}
 */
function parseDateInput_(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
