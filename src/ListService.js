/**
 * ListService.js
 * 担当者・見込み客(架電リスト)の取得と更新。
 */

/**
 * 担当者の一覧を取得する
 * @return {{name: string, email: string, role: string}[]}
 */
function getStaffList_() {
  const sheet = getSheet_(SHEET.STAFF);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.STAFF].length).getValues()
    .filter(function (r) { return r[COL.STAFF.NAME] !== ''; })
    .map(function (r) {
      return { name: String(r[COL.STAFF.NAME]), email: String(r[COL.STAFF.EMAIL]), role: String(r[COL.STAFF.ROLE]) };
    });
}

/**
 * 担当者名から担当者を取得する(見つからなければエラー)
 * @param {string} name
 * @return {{name: string, email: string, role: string}}
 */
function findStaff_(name) {
  const staff = getStaffList_().filter(function (s) { return s.name === name; })[0];
  if (!staff) throw new Error('担当者「' + name + '」が見つかりません。');
  return staff;
}

/**
 * 見込み客シートの1行を画面用のオブジェクトに変換する
 * @param {Array} r
 * @return {Object}
 */
function prospectToObject_(r) {
  const P = COL.PROSPECT;
  return {
    id: String(r[P.ID]),
    company: String(r[P.COMPANY]),
    industry: String(r[P.INDUSTRY]),
    size: String(r[P.SIZE]),
    address: String(r[P.ADDRESS]),
    lat: Number(r[P.LAT]) || null,
    lng: Number(r[P.LNG]) || null,
    phone: String(r[P.PHONE]),
    contact: String(r[P.CONTACT]),
    email: String(r[P.EMAIL]),
    owner: String(r[P.OWNER]),
    status: String(r[P.STATUS] || STATUS.NOT_CALLED),
    listType: String(r[P.LIST_TYPE] || listTypeOf_(r[P.STATUS])),
    favorite: r[P.FAVORITE] === true || String(r[P.FAVORITE]).toUpperCase() === 'TRUE',
    nextCallDate: formatDate_(r[P.NEXT_CALL_DATE], 'yyyy-MM-dd'),
    callCount: Number(r[P.CALL_COUNT]) || 0,
    lastCalledAt: formatDate_(r[P.LAST_CALLED_AT], 'yyyy-MM-dd HH:mm'),
    memo: String(r[P.MEMO]),
  };
}

/**
 * 見込み客をすべて取得する
 * @return {Object[]}
 */
function getAllProspects_() {
  const sheet = getSheet_(SHEET.PROSPECTS);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.PROSPECTS].length).getValues()
    .filter(function (r) { return r[COL.PROSPECT.ID] !== ''; })
    .map(prospectToObject_);
}

/**
 * 担当者が見られる見込み客を取得する
 * 営業は自分の担当分のみ、マネージャーは全件(画面側で担当者を絞り込む)。
 * @param {{name: string, role: string}} staff
 * @return {Object[]}
 */
function getProspectsFor_(staff) {
  const all = getAllProspects_();
  if (staff.role === ROLE.MANAGER) return all;
  return all.filter(function (p) { return p.owner === staff.name; });
}

/**
 * 見込み客IDからシートの行番号(1始まり)を探す
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} id
 * @return {number} 見つからなければエラー
 */
function findProspectRow_(sheet, id) {
  if (sheet.getLastRow() >= 2) {
    const ids = sheet.getRange(2, COL.PROSPECT.ID + 1, sheet.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === id) return i + 2;
    }
  }
  throw new Error('見込み客「' + id + '」が見つかりません。');
}

/**
 * LockService で排他制御しながら処理を実行する
 * @param {Function} fn
 * @return {*} fn の戻り値
 */
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new Error('他の人が更新中です。少し待ってからもう一度お試しください。');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * 見込み客の指定した列を更新する(LockService で排他制御)
 * @param {string} id 見込み客ID
 * @param {Object<string, *>} fields COL.PROSPECT のキー名 → 値 例:{ FAVORITE: true }
 * @return {Object} 更新後の見込み客
 */
function updateProspect_(id, fields) {
  return withLock_(function () {
    return applyProspectUpdate_(id, function () { return fields; });
  });
}

/**
 * 見込み客の1行を更新する(排他制御は呼び出し側で行う)
 * ステータスを更新した場合は、リスト区分もステータスから自動で決める。
 * @param {string} id 見込み客ID
 * @param {function(Object): Object<string, *>} makeFields 現在の見込み客を受け取り、更新する項目を返す関数
 * @return {Object} 更新後の見込み客
 */
function applyProspectUpdate_(id, makeFields) {
  const sheet = getSheet_(SHEET.PROSPECTS);
  const row = findProspectRow_(sheet, id);
  const range = sheet.getRange(row, 1, 1, HEADERS[SHEET.PROSPECTS].length);
  const values = range.getValues()[0];
  const fields = makeFields(prospectToObject_(values));

  Object.keys(fields).forEach(function (key) {
    if (!(key in COL.PROSPECT)) throw new Error('不明な項目です: ' + key);
    values[COL.PROSPECT[key]] = fields[key];
  });
  if ('STATUS' in fields) values[COL.PROSPECT.LIST_TYPE] = listTypeOf_(fields.STATUS);

  range.setValues([values]);
  return prospectToObject_(values);
}

/**
 * 見込み客を1件取得する
 * @param {string} id
 * @return {Object}
 */
function getProspect_(id) {
  const sheet = getSheet_(SHEET.PROSPECTS);
  const row = findProspectRow_(sheet, id);
  return prospectToObject_(sheet.getRange(row, 1, 1, HEADERS[SHEET.PROSPECTS].length).getValues()[0]);
}

/**
 * 今日の架電数を数える
 * @param {string|null} ownerName 担当者名(null ならチーム全体)
 * @return {number}
 */
function countTodayCalls_(ownerName) {
  const sheet = getSheet_(SHEET.CALL_HISTORY);
  if (sheet.getLastRow() < 2) return 0;
  const H = COL.HISTORY;
  const today = todayStr_();
  // 日時(B列)〜営業担当者(E列)だけを読む
  return sheet.getRange(2, H.DATETIME + 1, sheet.getLastRow() - 1, H.OWNER - H.DATETIME + 1).getValues()
    .filter(function (r) {
      return formatDate_(r[0], 'yyyy-MM-dd') === today &&
        (ownerName === null || String(r[H.OWNER - H.DATETIME]) === ownerName);
    }).length;
}
