/**
 * ScriptService.js
 * トークスクリプトと切り返し集の取得、差し込み項目の置き換え。
 */

/**
 * トークスクリプトを順番どおりに取得する
 * @return {{order: number, step: string, body: string, point: string}[]}
 */
function getTalkScript_() {
  const sheet = getSheet_(SHEET.TALK_SCRIPT);
  if (sheet.getLastRow() < 2) return [];
  const S = COL.SCRIPT;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.TALK_SCRIPT].length).getValues()
    .filter(function (r) { return r[S.BODY] !== ''; })
    .map(function (r) {
      return { order: Number(r[S.ORDER]) || 0, step: String(r[S.STEP]), body: String(r[S.BODY]), point: String(r[S.POINT]) };
    })
    .sort(function (a, b) { return a.order - b.order; });
}

/**
 * 切り返し集を取得する
 * @return {{category: string, keywords: string[], talk: string, nextAction: string}[]}
 */
function getRebuttals_() {
  const sheet = getSheet_(SHEET.REBUTTALS);
  if (sheet.getLastRow() < 2) return [];
  const R = COL.REBUTTAL;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.REBUTTALS].length).getValues()
    .filter(function (r) { return r[R.CATEGORY] !== ''; })
    .map(function (r) {
      return {
        category: String(r[R.CATEGORY]),
        // 全角・半角どちらのカンマでも区切れるようにする
        keywords: String(r[R.KEYWORDS]).split(/[,、,]/).map(function (k) { return k.trim(); }).filter(String),
        talk: String(r[R.TALK]),
        nextAction: String(r[R.NEXT_ACTION]),
      };
    });
}

/**
 * 差し込み項目の値を作る
 * @param {Object} prospect 見込み客
 * @param {string} staffName 架電する営業担当者
 * @return {Object<string, string>} 差し込み項目 → 値
 */
function placeholderValues_(prospect, staffName) {
  const values = {};
  values[PLACEHOLDER.COMPANY] = prospect.company;
  values[PLACEHOLDER.CONTACT] = prospect.contact || 'ご担当者';
  values[PLACEHOLDER.OWNER] = staffName;
  return values;
}

/**
 * 文章中の差し込み項目({会社名} など)を置き換える
 * @param {string} text
 * @param {Object<string, string>} values
 * @return {string}
 */
function fillPlaceholders_(text, values) {
  return Object.keys(values).reduce(function (result, key) {
    return result.split(key).join(values[key]);
  }, String(text));
}

/**
 * 見込み客に合わせて差し込み済みのトークスクリプトと切り返し集を作る
 * @param {Object} prospect
 * @param {string} staffName
 * @return {{steps: Object[], rebuttals: Object[]}}
 */
function buildScriptFor_(prospect, staffName) {
  const values = placeholderValues_(prospect, staffName);
  return {
    steps: getTalkScript_().map(function (s) {
      return { order: s.order, step: s.step, body: fillPlaceholders_(s.body, values), point: s.point };
    }),
    rebuttals: getRebuttals_().map(function (r) {
      return { category: r.category, talk: fillPlaceholders_(r.talk, values), nextAction: r.nextAction };
    }),
  };
}
