/**
 * DummyData.js
 * ダミーデータ(見込み客・導入企業・架電履歴)の生成と削除。
 * 会社名・人名・番地はすべて架空。緯度経度は各区の中心付近でランダムに生成する(ジオコーディングAPIは使わない)。
 */

const DUMMY_COUNT = {
  PROSPECTS: 150,
  CUSTOMERS: 80,
  HISTORY_DAYS: 30,
};

/**
 * 区の定義:[都県, 市, 区, 中心緯度, 中心経度, 出現の重み]
 * 重みが大きいほど多く分布する(都心部を多めにしている)。
 */
const DUMMY_AREAS = [
  ['東京都', '', '千代田区', 35.6940, 139.7536, 6],
  ['東京都', '', '中央区', 35.6707, 139.7720, 6],
  ['東京都', '', '港区', 35.6581, 139.7516, 7],
  ['東京都', '', '新宿区', 35.6938, 139.7034, 6],
  ['東京都', '', '渋谷区', 35.6640, 139.6982, 6],
  ['東京都', '', '品川区', 35.6092, 139.7302, 4],
  ['東京都', '', '文京区', 35.7081, 139.7524, 3],
  ['東京都', '', '台東区', 35.7126, 139.7800, 3],
  ['東京都', '', '豊島区', 35.7263, 139.7166, 3],
  ['東京都', '', '目黒区', 35.6415, 139.6982, 3],
  ['東京都', '', '江東区', 35.6730, 139.8170, 3],
  ['東京都', '', '世田谷区', 35.6464, 139.6532, 3],
  ['東京都', '', '墨田区', 35.7107, 139.8015, 2],
  ['東京都', '', '大田区', 35.5613, 139.7160, 2],
  ['東京都', '', '中野区', 35.7074, 139.6637, 2],
  ['東京都', '', '杉並区', 35.6995, 139.6364, 2],
  ['東京都', '', '北区', 35.7528, 139.7337, 1],
  ['東京都', '', '荒川区', 35.7362, 139.7834, 1],
  ['東京都', '', '板橋区', 35.7512, 139.7093, 1],
  ['東京都', '', '練馬区', 35.7356, 139.6517, 1],
  ['東京都', '', '足立区', 35.7750, 139.8044, 1],
  ['東京都', '', '葛飾区', 35.7434, 139.8472, 1],
  ['東京都', '', '江戸川区', 35.7067, 139.8683, 1],
  ['神奈川県', '横浜市', '西区', 35.4537, 139.6175, 4],
  ['神奈川県', '横浜市', '中区', 35.4444, 139.6382, 3],
  ['神奈川県', '横浜市', '港北区', 35.5195, 139.6331, 3],
  ['神奈川県', '横浜市', '神奈川区', 35.4767, 139.6295, 2],
  ['神奈川県', '横浜市', '都筑区', 35.5449, 139.5707, 1],
  ['神奈川県', '横浜市', '青葉区', 35.5527, 139.5372, 1],
  ['神奈川県', '横浜市', '鶴見区', 35.5085, 139.6825, 1],
  ['神奈川県', '横浜市', '戸塚区', 35.3961, 139.5329, 1],
  ['神奈川県', '川崎市', '川崎区', 35.5308, 139.7029, 3],
  ['神奈川県', '川崎市', '中原区', 35.5761, 139.6595, 3],
  ['神奈川県', '川崎市', '幸区', 35.5444, 139.6863, 1],
  ['神奈川県', '川崎市', '高津区', 35.5994, 139.6146, 1],
  ['神奈川県', '川崎市', '宮前区', 35.5885, 139.5827, 1],
  ['神奈川県', '川崎市', '多摩区', 35.6194, 139.5620, 1],
  ['神奈川県', '川崎市', '麻生区', 35.6038, 139.5049, 1],
];

/** 区の中心からのばらつき(度)。おおよそ ±0.8km 〜 ±0.9km */
const DUMMY_SPREAD = { LAT: 0.0075, LNG: 0.0095 };

/** 架空の町名・ビル名 */
const DUMMY_TOWNS = ['さくら通り', 'けやき町', 'いちょう台', 'ひのき町', 'かえで坂', 'つばき町', 'もみじ台', 'すずかけ町', 'あおぎり町', 'こぶし台', 'はなみずき通り', 'くすのき町'];
const DUMMY_BUILDINGS = ['グリーンテラス', 'リーフタワー', 'フォレストビル', 'ソラノハビル', 'ミドリエ館', 'ハルカゼビル', 'アオバスクエア', 'コモレビビル'];

/** 架空の社名を作るための造語 */
const DUMMY_NAME_WORDS = [
  'ソラノハ', 'ミドリエ', 'アオイロ', 'ハルカゼ', 'コモレビ', 'ルミナス', 'ヒカリノ', 'ツバサノ', 'ステラリス',
  'フィオーレ', 'クレスティア', 'リンクス', 'ネクステラ', 'ブルーミア', 'サンリーフ', 'ミライエ', 'ハーモニア',
  'アクシオ', 'エルムリーフ', 'ウィンベル', 'カナリエ', 'セレノア', 'トワイル', 'ノルディア', 'パレット', 'ユイマール',
  'ラフィーナ', 'ワカバノ', 'オリーブン', 'シラカバ', 'ミズナラ', 'アカシア', 'ポプラス', 'クローバー', 'フェルン',
];

/** 業種ごとの社名の語尾 */
const DUMMY_NAME_SUFFIX = {
  'IT': ['テック', 'システムズ', 'デジタル', 'ラボ'],
  '不動産': ['不動産', 'エステート', 'ハウジング'],
  '士業': ['総合法律事務所', '会計事務所', '社労士事務所', '特許事務所'],
  '人材': ['キャリア', 'スタッフィング', 'ヒューマンリンク'],
  '飲食本部': ['フードサービス', 'ダイニング', 'キッチンズ'],
  '広告・デザイン': ['クリエイティブ', 'デザイン', 'プランニング'],
  'コンサルティング': ['コンサルティング', 'パートナーズ', 'アドバイザリー'],
  '教育・スクール': ['アカデミー', 'スクール', 'エデュケーション'],
  '建設・設計': ['設計', '建築設計', 'ホーム'],
  '卸売・商社': ['商事', 'トレーディング', '物産'],
};

/** 担当窓口の部署名・姓(架空の組み合わせ) */
const DUMMY_DEPARTMENTS = ['総務部', '総務課', '管理部', '経営企画室', '人事総務部', 'オフィス管理課', '代表'];
const DUMMY_SURNAMES = ['田中', '山本', '中村', '小林', '加藤', '吉田', '山口', '松本', '井上', '木村', '清水', '池田', '橋本', '石川', '前田', '藤井', '岡田', '長谷川', '村上', '近藤'];

/**
 * 担当者ごとの成績の傾向(最終ステータスの出やすさ)
 * 並び順は担当者シートの営業担当者の並び順に対応する。足りない場合は最後の傾向を使う。
 */
const DUMMY_OWNER_PROFILES = [
  // トップ営業:成約が多く、架電も多い
  { weights: { '未架電': 10, '不在・再架電': 20, '見込み': 18, '資料送付済み': 14, '成約': 20, 'NG': 18 }, extraCalls: 2 },
  // 中堅
  { weights: { '未架電': 18, '不在・再架電': 22, '見込み': 18, '資料送付済み': 12, '成約': 10, 'NG': 20 }, extraCalls: 0 },
  // 中堅(やや苦戦)
  { weights: { '未架電': 22, '不在・再架電': 25, '見込み': 14, '資料送付済み': 12, '成約': 7, 'NG': 20 }, extraCalls: 1 },
  // 新人:架電数は多いが成約は少なく、NGが多い
  { weights: { '未架電': 22, '不在・再架電': 26, '見込み': 12, '資料送付済み': 8, '成約': 3, 'NG': 29 }, extraCalls: 3 },
];

/** 通話メモの例(結果ステータスごと) */
const DUMMY_CALL_MEMOS = {
  '不在・再架電': ['担当者不在。夕方に再架電', '受付にて不在と言われた', '会議中とのこと。明日午前に再架電', '外出中。戻りは未定', '電話がつながらず'],
  '見込み': ['観葉植物に興味あり。来月のレイアウト変更で検討', '受付の印象を良くしたいとのこと', '以前から検討していた。料金次第', '会議室に置きたいとの話あり', '社員の休憩スペース向けに検討中'],
  '資料送付済み': ['サービス紹介資料をメール送付', '料金表を送付。上長に共有するとのこと', '導入事例集を送付。来週に感想を確認'],
  '成約': ['スタンダードプランで契約。来週設置', 'ライトプランで契約。受付に3鉢', 'プレミアムプランで契約。エントランス全体をリニューアル'],
  'NG': ['現在は検討していないとのこと', '他社と契約中で更新予定なし', '予算が取れないとのこと', 'オフィス縮小のため不要', '本社で一括管理しているとのこと'],
};

/** 断り文句の分類の出やすさ(切り返し集の分類名と一致させる) */
const DUMMY_REBUTTAL_WEIGHTS = {
  '間に合っている': 26, '予算がない': 20, '忙しい': 14, '資料だけ送って': 16, '上に確認しないと': 12,
  '他社を使っている': 10, '手入れが大変': 7, '置く場所がない': 8, '移転・改装の予定がある': 3, '担当者が分からない': 5,
};

/**
 * ダミーデータを生成する(見込み客150件・導入企業80件・架電履歴 約600件)
 * データが既にある場合は、誤って上書きしないよう中止する。
 */
function generateDummyData() {
  try {
    const prospectSheet = getSheet_(SHEET.PROSPECTS);
    const customerSheet = getSheet_(SHEET.CUSTOMERS);
    const historySheet = getSheet_(SHEET.CALL_HISTORY);
    if (prospectSheet.getLastRow() > 1 || customerSheet.getLastRow() > 1 || historySheet.getLastRow() > 1) {
      throw new Error('既にデータがあります。作り直す場合は先に clearDummyData() を実行してください。');
    }

    const owners = getSalesStaffNames_();
    if (owners.length === 0) throw new Error('担当者シートに営業担当者がいません。先に setup() を実行してください。');
    const categories = getRebuttalCategories_();

    const result = buildDummyData_(owners, categories, new Date());

    writeRows_(prospectSheet, result.prospects);
    writeRows_(customerSheet, result.customers);
    writeRows_(historySheet, result.history);
    prospectSheet.getRange(2, COL.PROSPECT.FAVORITE + 1, result.prospects.length, 1).insertCheckboxes();

    const msg = '見込み客 ' + result.prospects.length + '件、導入企業 ' + result.customers.length +
      '件、架電履歴 ' + result.history.length + '件を生成しました';
    writeLog_('generateDummyData', '成功', '');
    toast_(msg);
  } catch (e) {
    writeLog_('generateDummyData', '失敗', e.message);
    throw e;
  }
}

/**
 * ダミーデータ(見込み客・導入企業・架電履歴)を一括削除する
 * 見出し行と、担当者・トークスクリプトなどのマスタは残す。
 */
function clearDummyData() {
  try {
    [SHEET.PROSPECTS, SHEET.CUSTOMERS, SHEET.CALL_HISTORY].forEach(function (name) {
      const sheet = getSheet_(name);
      const last = sheet.getLastRow();
      if (last > 1) {
        const range = sheet.getRange(2, 1, last - 1, sheet.getLastColumn());
        range.removeCheckboxes();
        range.clearContent();
      }
    });
    writeLog_('clearDummyData', '成功', '');
    toast_('ダミーデータを削除しました');
  } catch (e) {
    writeLog_('clearDummyData', '失敗', e.message);
    throw e;
  }
}

/** 担当者シートから営業担当者の名前を取得する */
function getSalesStaffNames_() {
  const sheet = getSheet_(SHEET.STAFF);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.STAFF].length).getValues()
    .filter(function (r) { return r[COL.STAFF.ROLE] === ROLE.SALES && r[COL.STAFF.NAME]; })
    .map(function (r) { return String(r[COL.STAFF.NAME]); });
}

/** 切り返し集シートから断り文句の分類を取得する */
function getRebuttalCategories_() {
  const sheet = getSheet_(SHEET.REBUTTALS);
  if (sheet.getLastRow() < 2) return Object.keys(DUMMY_REBUTTAL_WEIGHTS);
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
    .map(function (r) { return String(r[0]); })
    .filter(String);
}

/** 2行目から行データをまとめて書き込む */
function writeRows_(sheet, rows) {
  if (rows.length === 0) return;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

/**
 * ダミーデータ一式を組み立てる(シートには触れない純粋な処理)
 * @param {string[]} owners 営業担当者名
 * @param {string[]} categories 断り文句の分類
 * @param {Date} now 基準日時
 * @return {{prospects: Array[], customers: Array[], history: Array[]}}
 */
function buildDummyData_(owners, categories, now) {
  const usedNames = {};
  const businessDays = recentBusinessDays_(now, DUMMY_COUNT.HISTORY_DAYS);
  const prospects = [];
  const calls = [];
  // 担当者ごとの最終ステータスを、成績の傾向の比率どおりに配分する(実行ごとの順位の入れ替わりを防ぐ)
  const statusDecks = owners.map(function (_, idx) {
    const count = Math.ceil((DUMMY_COUNT.PROSPECTS - idx) / owners.length);
    return buildStatusDeck_(profileOf_(idx).weights, count);
  });

  for (let i = 0; i < DUMMY_COUNT.PROSPECTS; i++) {
    const ownerIndex = i % owners.length;
    const owner = owners[ownerIndex];
    const profile = profileOf_(ownerIndex);
    const industry = pick_(INDUSTRIES);
    const area = pickWeighted_(DUMMY_AREAS, function (a) { return a[5]; });
    const point = randomPointInArea_(area);
    const id = ID_PREFIX.PROSPECT + pad_(i + 1, 4);
    const company = uniqueCompanyName_(industry, usedNames);
    const contact = pick_(DUMMY_DEPARTMENTS) + ' ' + pick_(DUMMY_SURNAMES);

    const finalStatus = statusDecks[ownerIndex].pop();
    const sequence = buildCallSequence_(finalStatus, profile.extraCalls);
    const callTimes = pickCallTimes_(businessDays, sequence.length, now);

    sequence.forEach(function (status, n) {
      calls.push({
        datetime: callTimes[n], prospectId: id, company: company, owner: owner, status: status,
        memo: pick_(DUMMY_CALL_MEMOS[status]),
        rebuttal: rebuttalFor_(status, categories),
      });
    });

    const lastCall = callTimes.length ? callTimes[callTimes.length - 1] : '';
    prospects.push([
      id, company, industry, pick_(EMPLOYEE_SIZES), point.address, point.lat, point.lng,
      '03-0000-' + pad_(1000 + i * 7 % 9000, 4),
      contact,
      id.toLowerCase() + '@' + DUMMY_EMAIL_DOMAIN,
      owner, finalStatus, listTypeOf_(finalStatus),
      Math.random() < (finalStatus === STATUS.PROSPECT || finalStatus === STATUS.MATERIAL_SENT ? 0.3 : 0.06),
      nextCallDate_(finalStatus, lastCall, now),
      sequence.length,
      lastCall,
      Math.random() < 0.25 ? pick_(['オフィス移転予定あり', '受付が広い', '決裁者は社長', '午前中がつながりやすい', '前回は会議中だった', '新しいビルに入居したばかり']) : '',
    ]);
  }

  // 架電履歴は日時順に並べてからIDを振る
  calls.sort(function (a, b) { return a.datetime - b.datetime; });
  const history = calls.map(function (c, i) {
    return [ID_PREFIX.HISTORY + pad_(i + 1, 5), c.datetime, c.prospectId, c.company, c.owner, c.status, c.memo, c.rebuttal];
  });

  const customers = [];
  for (let j = 0; j < DUMMY_COUNT.CUSTOMERS; j++) {
    const area = pickWeighted_(DUMMY_AREAS, function (a) { return a[5]; });
    const point = randomPointInArea_(area);
    const plan = pickWeighted_(PLANS, function (p) { return { 'ライト': 45, 'スタンダード': 40, 'プレミアム': 15 }[p]; });
    const pots = plan === 'ライト' ? randInt_(3, 8) : plan === 'スタンダード' ? randInt_(8, 20) : randInt_(20, 60);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - randInt_(30, 365 * 3));
    customers.push([
      ID_PREFIX.CUSTOMER + pad_(j + 1, 4), uniqueCompanyName_(pick_(INDUSTRIES), usedNames),
      point.address, point.lat, point.lng, start, plan, pots,
    ]);
  }

  return { prospects: prospects, customers: customers, history: history };
}

/** 担当者の並び順に対応する成績の傾向を返す */
function profileOf_(ownerIndex) {
  return DUMMY_OWNER_PROFILES[Math.min(ownerIndex, DUMMY_OWNER_PROFILES.length - 1)];
}

/**
 * 重みの比率どおりにステータスを count 件並べ、シャッフルして返す
 * @param {Object<string, number>} weights
 * @param {number} count
 * @return {string[]}
 */
function buildStatusDeck_(weights, count) {
  const keys = Object.keys(weights);
  const total = keys.reduce(function (sum, k) { return sum + weights[k]; }, 0);
  const deck = [];
  keys.forEach(function (k) {
    for (let n = Math.round(weights[k] / total * count); n > 0; n--) deck.push(k);
  });
  // 四捨五入による過不足を調整する
  while (deck.length < count) deck.push(STATUS.ABSENT);
  deck.length = count;
  return shuffle_(deck);
}

/**
 * 最終ステータスに至るまでの架電結果の並びを作る
 * 例:成約 → [不在, 不在, 見込み, 資料送付済み, 見込み, 成約]
 * @param {string} finalStatus
 * @param {number} extraCalls 担当者ごとの追加の不在回数(架電量の差)
 * @return {string[]}
 */
function buildCallSequence_(finalStatus, extraCalls) {
  if (finalStatus === STATUS.NOT_CALLED) return [];
  const absent = function (n) { return new Array(n).fill(STATUS.ABSENT); };
  const leadIn = absent(randInt_(1, 3 + extraCalls));
  const followUps = function (max) { return new Array(randInt_(0, max)).fill(STATUS.PROSPECT); };

  switch (finalStatus) {
    case STATUS.ABSENT:
      return absent(randInt_(2, 5 + extraCalls));
    case STATUS.PROSPECT:
      return leadIn.concat([STATUS.PROSPECT], followUps(2));
    case STATUS.MATERIAL_SENT:
      return leadIn.concat([STATUS.PROSPECT], followUps(1), [STATUS.MATERIAL_SENT]);
    case STATUS.WON:
      return leadIn.concat([STATUS.PROSPECT, STATUS.MATERIAL_SENT], followUps(2), [STATUS.WON]);
    case STATUS.NG:
      return Math.random() < 0.3
        ? leadIn.concat([STATUS.PROSPECT], followUps(1), [STATUS.NG])
        : leadIn.concat([STATUS.NG]);
  }
  return [];
}

/**
 * 結果ステータスに応じて「使用した切り返し(断り文句の分類)」を決める
 * NG は必ず断り文句あり、見込み・資料送付は一部で切り返しに成功した想定。
 */
function rebuttalFor_(status, categories) {
  const pickCategory = function () {
    return pickWeighted_(categories, function (c) { return DUMMY_REBUTTAL_WEIGHTS[c] || 5; });
  };
  if (status === STATUS.NG) return pickCategory();
  if (status === STATUS.MATERIAL_SENT && Math.random() < 0.5 && categories.indexOf('資料だけ送って') !== -1) return '資料だけ送って';
  if ((status === STATUS.PROSPECT || status === STATUS.MATERIAL_SENT || status === STATUS.WON) && Math.random() < 0.35) return pickCategory();
  return '';
}

/**
 * 直近 days 日間の平日(今日を含む)を古い順に返す
 * @param {Date} now
 * @param {number} days
 * @return {Date[]} 各日の0時
 */
function recentBusinessDays_(now, days) {
  const list = [];
  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    const w = day.getDay();
    if (w !== 0 && w !== 6) list.push(day);
  }
  return list;
}

/**
 * 架電日時を count 件、重複しない平日から選んで古い順に返す
 * 今日の架電は現在時刻より前の時間にする。
 * @param {Date[]} businessDays
 * @param {number} count
 * @param {Date} now
 * @return {Date[]}
 */
function pickCallTimes_(businessDays, count, now) {
  if (count === 0) return [];
  const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMin = 9 * 60 + 30;
  const endMin = 18 * 60;
  // 今日の就業時間が始まっていなければ、今日は候補から外す
  const days = businessDays.filter(function (d) {
    return d.getTime() !== todayKey || nowMinutes > startMin + 10;
  });

  const indexes = shuffle_(days.map(function (_, i) { return i; }))
    .slice(0, Math.min(count, days.length))
    .sort(function (a, b) { return a - b; });

  return indexes.map(function (i) {
    const day = days[i];
    const limit = day.getTime() === todayKey ? Math.min(endMin, nowMinutes - 1) : endMin;
    const minutes = randInt_(startMin, limit);
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
  });
}

/**
 * 最終ステータスと最終架電日時から次回架電日を決める
 * 古くなりすぎた日付は今日の前後に寄せ、土日は翌月曜にずらす。
 * 今日以前になるものもある(「今日かける」の表示確認用)。
 */
function nextCallDate_(status, lastCall, now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const addDays = function (base, n) { return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n); };
  const ranges = {};
  ranges[STATUS.ABSENT] = [1, 5];
  ranges[STATUS.PROSPECT] = [3, 14];
  ranges[STATUS.MATERIAL_SENT] = [2, 7];

  let date;
  if (status === STATUS.NOT_CALLED) {
    if (Math.random() >= 0.3) return '';
    date = addDays(today, randInt_(0, 3));
  } else if (ranges[status]) {
    date = addDays(lastCall, randInt_(ranges[status][0], ranges[status][1]));
    if (date < addDays(today, -2)) date = addDays(today, randInt_(-2, 6));
  } else {
    return '';
  }
  return toWeekday_(date);
}

/** 土日なら翌月曜日にする */
function toWeekday_(date) {
  const w = date.getDay();
  if (w === 6) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 2);
  if (w === 0) return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return date;
}

/** 区の中心付近にランダムな地点と架空の住所を作る */
function randomPointInArea_(area) {
  const lat = area[3] + (Math.random() * 2 - 1) * DUMMY_SPREAD.LAT;
  const lng = area[4] + (Math.random() * 2 - 1) * DUMMY_SPREAD.LNG;
  const address = area[0] + area[1] + area[2] + pick_(DUMMY_TOWNS) +
    randInt_(1, 5) + '丁目' + randInt_(1, 25) + '-' + randInt_(1, 15) +
    (Math.random() < 0.7 ? ' ' + pick_(DUMMY_BUILDINGS) + randInt_(2, 9) + 'F' : '');
  return { lat: round_(lat, 6), lng: round_(lng, 6), address: address };
}

/** 重複しない架空の社名を作る */
function uniqueCompanyName_(industry, usedNames) {
  for (let tries = 0; tries < 200; tries++) {
    const core = pick_(DUMMY_NAME_WORDS) + pick_(DUMMY_NAME_SUFFIX[industry] || ['商会']);
    const name = /事務所$/.test(core) ? core
      : Math.random() < 0.5 ? '株式会社' + core : core + '株式会社';
    if (!usedNames[name]) {
      usedNames[name] = true;
      return name;
    }
  }
  throw new Error('社名の生成に失敗しました');
}

/* ===== 乱数などの小さな補助関数 ===== */

function randInt_(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick_(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickWeighted_(list, weightOf) {
  const total = list.reduce(function (sum, x) { return sum + weightOf(x); }, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weightOf(list[i]);
    if (r < 0) return list[i];
  }
  return list[list.length - 1];
}

function shuffle_(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function pad_(n, width) {
  return String(n).padStart(width, '0');
}

function round_(x, digits) {
  const f = Math.pow(10, digits);
  return Math.round(x * f) / f;
}
