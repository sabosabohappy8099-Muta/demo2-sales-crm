/**
 * PublicDemo.js
 * 公開デモ(ログインなしで誰でも触れる版)のための処理。PUBLIC_DEMO_MODE が true の版でだけ使う。
 *
 * 公開デモでは、知らない人が画面を操作するため、次のようにしている
 * - 資料のメール送付・下書きは、実際には行わず「送信記録(デモ)」シートに残す(recordDemoMail_)
 * - 資料の PDF は作らない(ドライブ・ドキュメントの権限を持たせないため)
 * - AI は MOCK に固定する(AiService.js)
 * - 毎晩4時にデータを最初の状態に戻す(resetPublicDemo)
 * - 使える権限を public/appsscript.json で最小限にしている
 */

/** 送信記録のシート名 */
const DEMO_MAIL_SHEET_NAME = '送信記録(デモ)';
const DEMO_MAIL_HEADERS = ['日時', '種類', '宛先', '件名', '本文'];

/** 公開デモの担当者のアドレス(架空) */
const DEMO_STAFF_EMAIL = 'staff@example.com';

/** 毎晩リセットする時刻(時) */
const PUBLIC_RESET_HOUR = 4;

/**
 * 公開デモの初期セットアップ。Apps Script エディタから1回実行する。
 * シートとマスタを作り、ダミーデータを入れ、毎晩のリセットを登録する。
 */
function setupPublicDemo() {
  assertPublicDemo_();
  setup();
  resetPublicDemoInternal_();
  setupPublicResetTrigger_();
  console.log('公開デモの準備ができました。');
}

/**
 * 公開デモのデータを最初の状態に戻す(毎晩のトリガーから呼ばれる)。
 * 画面から呼ばれても、デモのシートが最初の状態に戻るだけ。
 */
function resetPublicDemo() {
  assertPublicDemo_();
  resetPublicDemoInternal_();
}

/** resetPublicDemo() の本体 */
function resetPublicDemoInternal_() {
  // 見込み客・導入企業・架電履歴を作り直す(日付は今日を基準に新しくなる)
  clearDummyData();
  generateDummyData();

  // 担当者のアドレスは架空のものにそろえる
  const staff = getSheet_(SHEET.STAFF);
  if (staff.getLastRow() >= 2) {
    staff.getRange(2, COL.STAFF.EMAIL + 1, staff.getLastRow() - 1, 1).setValue(DEMO_STAFF_EMAIL);
  }

  clearSheetBody_(getDemoMailSheet_());
  clearSheetBody_(getSheet_(SHEET.LOG));
}

/** 毎晩のリセットのトリガーを登録する(作り直して重複を防ぐ) */
function setupPublicResetTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'resetPublicDemo') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('resetPublicDemo').timeBased().everyDays(1).atHour(PUBLIC_RESET_HOUR).create();
}

/**
 * メールを送る代わりに「送信記録(デモ)」シートに残す。
 */
function recordDemoMail_(kind, to, subject, body) {
  getDemoMailSheet_().appendRow([new Date(), kind, to, subject, body]);
}

/**
 * 画面に出す公開デモの案内。公開デモでなければ null。
 * @return {?{resetHour: number}}
 */
function getPublicDemoInfo_() {
  return PUBLIC_DEMO_MODE ? { resetHour: PUBLIC_RESET_HOUR } : null;
}

/** 送信記録のシート(なければ作る) */
function getDemoMailSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(DEMO_MAIL_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DEMO_MAIL_SHEET_NAME);
    sheet.getRange(1, 1, 1, DEMO_MAIL_HEADERS.length).setValues([DEMO_MAIL_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** 見出し行を残して、シートの中身を消す */
function clearSheetBody_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
}

/** 公開デモの版でなければ止める(手元の版で、うっかりデータを消さないため) */
function assertPublicDemo_() {
  if (!PUBLIC_DEMO_MODE) {
    throw new Error('この関数は公開デモの版でだけ使えます(bin/build-public.sh で組み立てた版)。');
  }
}
