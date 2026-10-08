/**
 * WebApp.js
 * Webアプリの入口(doGet)と、画面から google.script.run で呼ばれる関数。
 * 画面から呼ぶ関数は末尾に _ を付けない(_ 付きは画面から呼べない非公開関数)。
 */

/**
 * Webアプリの画面を返す
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(APP.TOOL_NAME + '|' + APP.COMPANY_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * HTMLファイルを読み込む(index.html から css / js を差し込むために使う)
 * @param {string} filename
 * @return {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 画面の初期表示に必要なデータ
 * @return {Object}
 */
function getInitialData() {
  return handleApi_('getInitialData', function () {
    const settings = getSettings_();
    return {
      companyName: String(settings[SETTING_KEY.COMPANY_NAME] || APP.COMPANY_NAME),
      toolName: APP.TOOL_NAME,
      staff: getStaffList_().map(function (s) { return { name: s.name, role: s.role }; }),
      statusList: STATUS_LIST,
      listTypes: [LIST_TYPE.NORMAL, LIST_TYPE.PROSPECT, LIST_TYPE.WON, LIST_TYPE.NG],
      roles: ROLE,
    };
  });
}

/**
 * 架電リスト画面のデータ(見込み客・今日の架電数・目標)
 * @param {string} staffName 画面で選択中の担当者名
 * @return {Object}
 */
function getListData(staffName) {
  return handleApi_('getListData', function () {
    const staff = findStaff_(staffName);
    const result = progressOf_(staff);
    result.today = todayStr_();
    result.prospects = getProspectsFor_(staff);
    return result;
  });
}

/**
 * 架電モードを開くときのデータ(会社情報・過去の履歴・差し込み済みのスクリプトと切り返し)
 * @param {string} prospectId
 * @param {string} staffName
 * @return {Object}
 */
function getCallContext(prospectId, staffName) {
  return handleApi_('getCallContext', function () {
    findStaff_(staffName);
    const prospect = getProspect_(prospectId);
    const script = buildScriptFor_(prospect, staffName);
    return {
      prospect: prospect,
      history: getCallHistory_(prospectId),
      steps: script.steps,
      rebuttals: script.rebuttals,
      nearby: countNearbyCustomers_(prospect),
      today: todayStr_(),
    };
  });
}

/**
 * 資料送付ダイアログ用:資料ごとの差し込み済みメール(件名・本文)と送信先
 * @param {string} prospectId
 * @param {string} staffName
 * @return {{to: string, mails: Object[]}}
 */
function getMaterialMails(prospectId, staffName) {
  return handleApi_('getMaterialMails', function () {
    findStaff_(staffName);
    const prospect = getProspect_(prospectId);
    return { to: prospect.email, mails: buildMaterialMails_(prospect, staffName) };
  });
}

/**
 * 資料を送付する(Gmailの下書き保存/今すぐ送信)
 * @param {Object} input MailService.sendMaterial_ の引数
 * @return {Object} 更新後の見込み客・履歴・今日の進捗
 */
function sendMaterial(input) {
  return handleApi_('sendMaterial', function () {
    const staff = findStaff_(input.staffName);
    const result = sendMaterial_(input);
    result.progress = progressOf_(staff);
    return result;
  });
}

/**
 * 地図検索用:導入企業の一覧と地図の初期表示
 * @return {Object}
 */
function getMapData() {
  return handleApi_('getMapData', function () {
    const settings = getSettings_();
    return {
      customers: getCustomers_(),
      center: {
        lat: Number(settings[SETTING_KEY.MAP_CENTER_LAT]),
        lng: Number(settings[SETTING_KEY.MAP_CENTER_LNG]),
      },
      defaultRadiusKm: Number(settings[SETTING_KEY.MAP_DEFAULT_RADIUS_KM]) || 2,
      radius: MAP_RADIUS,
      plans: PLANS,
    };
  });
}

/**
 * 成果ダッシュボードのデータ
 * @param {string} staffName
 * @param {string} period 'today' / 'week' / 'month'
 * @param {string} ownerFilter マネージャーの担当者絞り込み(空なら全員)
 * @return {Object}
 */
function getDashboard(staffName, period, ownerFilter) {
  return handleApi_('getDashboard', function () {
    return buildDashboard_(findStaff_(staffName), period, ownerFilter);
  });
}

/**
 * 住所を緯度経度に変換する
 * @param {string} address
 * @return {{lat: number, lng: number, address: string}}
 */
function geocode(address) {
  return handleApi_('geocode', function () {
    return geocodeAddress_(address);
  });
}

/**
 * 相手の言葉から切り返しを提案する
 * @param {string} text
 * @param {string} prospectId
 * @param {string} staffName
 * @return {Object}
 */
function suggestRebuttal(text, prospectId, staffName) {
  return handleApi_('suggestRebuttal', function () {
    return suggestRebuttal_(String(text || '').slice(0, 500), getProspect_(prospectId), staffName);
  });
}

/**
 * 架電結果を保存する
 * @param {{prospectId: string, staffName: string, status: string, memo: string, nextCallDate: string, rebuttal: string}} input
 * @return {Object} 更新後の見込み客・追加した履歴・今日の進捗
 */
function saveCallResult(input) {
  return handleApi_('saveCallResult', function () {
    const staff = findStaff_(input.staffName);
    const saved = saveCallResult_(input);
    writeLog_('saveCallResult', '成功', '');
    saved.progress = progressOf_(staff);
    return saved;
  });
}

/**
 * 今日の架電数と目標
 * マネージャーはチーム全体の架電数と目標(目標 × 営業人数)を返す。
 * @param {{name: string, role: string}} staff
 * @return {{todayCount: number, dailyTarget: number}}
 */
function progressOf_(staff) {
  const isManager = staff.role === ROLE.MANAGER;
  const dailyTarget = Number(getSettings_()[SETTING_KEY.DAILY_CALL_TARGET]) || 0;
  const salesCount = getStaffList_().filter(function (s) { return s.role === ROLE.SALES; }).length;
  return {
    todayCount: countTodayCalls_(isManager ? null : staff.name),
    dailyTarget: isManager ? dailyTarget * salesCount : dailyTarget,
  };
}

/**
 * お気に入りを切り替える
 * @param {string} prospectId
 * @param {boolean} favorite
 * @return {Object} 更新後の見込み客
 */
function setFavorite(prospectId, favorite) {
  return handleApi_('setFavorite', function () {
    return updateProspect_(prospectId, { FAVORITE: favorite === true });
  });
}

/**
 * 画面から呼ばれる処理の共通エラー処理
 * 失敗したらログに記録し、画面にはエラーメッセージを返す。
 * @param {string} name 処理名
 * @param {Function} fn
 * @return {*}
 */
function handleApi_(name, fn) {
  try {
    return fn();
  } catch (e) {
    writeLog_(name, '失敗', e.stack || e.message);
    // こちらで用意した日本語のメッセージはそのまま、想定外の内部エラーは分かりやすい文に置き換える
    const message = /[ぁ-んァ-ヶ一-龠]/.test(String(e.message))
      ? e.message
      : '処理中にエラーが発生しました。時間をおいてもう一度お試しください(詳細はログシートに記録しました)。';
    throw new Error(message);
  }
}
