/**
 * Config.js
 * 定数・シート名・列定義・ステータス定義をまとめたファイル。
 * 他のファイルからは CONFIG / SHEET / COL などを参照する。
 */

/** アプリ全体の基本情報 */
const APP = {
  COMPANY_NAME: 'みどりのオフィス株式会社',
  TOOL_NAME: '架電支援ミニCRM',
  TIMEZONE: 'Asia/Tokyo',
};

/** シート名 */
const SHEET = {
  PROSPECTS: '見込み客',
  CUSTOMERS: '導入企業',
  CALL_HISTORY: '架電履歴',
  STAFF: '担当者',
  TALK_SCRIPT: 'トークスクリプト',
  REBUTTALS: '切り返し集',
  MATERIALS: '資料',
  SETTINGS: '設定',
  LOG: 'ログ',
};

/**
 * 各シートの見出し行(列の並び順もこの定義に従う)
 * Setup.js でシートを作成するときに使用する。
 */
const HEADERS = {
  [SHEET.PROSPECTS]: [
    '見込み客ID', '会社名', '業種', '従業員規模', '住所', '緯度', '経度',
    '電話番号', '担当窓口', 'メールアドレス', '営業担当者', 'ステータス',
    'リスト区分', 'お気に入り', '次回架電日', '架電回数', '最終架電日時', 'メモ',
  ],
  [SHEET.CUSTOMERS]: [
    '導入企業ID', '会社名', '住所', '緯度', '経度', '導入開始日', '月額プラン', '設置鉢数',
  ],
  [SHEET.CALL_HISTORY]: [
    '履歴ID', '日時', '見込み客ID', '会社名', '営業担当者', '結果ステータス', '通話メモ', '使用した切り返し',
  ],
  [SHEET.STAFF]: ['担当者名', 'メールアドレス', '役割'],
  [SHEET.TALK_SCRIPT]: ['順番', 'ステップ名', 'トーク本文', 'ポイント'],
  [SHEET.REBUTTALS]: ['断り文句の分類', '判定キーワード', '切り返しトーク', '次のアクション'],
  [SHEET.MATERIALS]: ['資料名', 'ドライブのファイルID', 'メール件名テンプレート', 'メール本文テンプレート'],
  [SHEET.SETTINGS]: ['項目', '値', '説明'],
  [SHEET.LOG]: ['日時', '処理名', '結果', 'エラー内容'],
};

/**
 * 列番号の定義(0始まり。getValues() で取得した配列の添字として使う)
 * シートの列番号(1始まり)が必要な場合は +1 する。
 */
const COL = {
  PROSPECT: {
    ID: 0, COMPANY: 1, INDUSTRY: 2, SIZE: 3, ADDRESS: 4, LAT: 5, LNG: 6,
    PHONE: 7, CONTACT: 8, EMAIL: 9, OWNER: 10, STATUS: 11,
    LIST_TYPE: 12, FAVORITE: 13, NEXT_CALL_DATE: 14, CALL_COUNT: 15, LAST_CALLED_AT: 16, MEMO: 17,
  },
  CUSTOMER: {
    ID: 0, COMPANY: 1, ADDRESS: 2, LAT: 3, LNG: 4, START_DATE: 5, PLAN: 6, POTS: 7,
  },
  HISTORY: {
    ID: 0, DATETIME: 1, PROSPECT_ID: 2, COMPANY: 3, OWNER: 4, RESULT: 5, MEMO: 6, REBUTTAL: 7,
  },
  STAFF: { NAME: 0, EMAIL: 1, ROLE: 2 },
  SCRIPT: { ORDER: 0, STEP: 1, BODY: 2, POINT: 3 },
  REBUTTAL: { CATEGORY: 0, KEYWORDS: 1, TALK: 2, NEXT_ACTION: 3 },
  MATERIAL: { NAME: 0, FILE_ID: 1, SUBJECT: 2, BODY: 3 },
  SETTING: { KEY: 0, VALUE: 1, NOTE: 2 },
  LOG: { DATETIME: 0, PROCESS: 1, RESULT: 2, ERROR: 3 },
};

/** ステータス(見込み客シートL列・架電履歴シートF列) */
const STATUS = {
  NOT_CALLED: '未架電',
  ABSENT: '不在・再架電',
  PROSPECT: '見込み',
  MATERIAL_SENT: '資料送付済み',
  WON: '成約',
  NG: 'NG',
};

/** ステータスの並び順(画面のプルダウン等で使用) */
const STATUS_LIST = [
  STATUS.NOT_CALLED,
  STATUS.ABSENT,
  STATUS.PROSPECT,
  STATUS.MATERIAL_SENT,
  STATUS.WON,
  STATUS.NG,
];

/** リスト区分(見込み客シートM列) */
const LIST_TYPE = {
  NORMAL: '通常',
  PROSPECT: '見込み',
  WON: '成約',
  NG: 'NG',
};

/** ステータス → リスト区分 の対応表 */
const STATUS_TO_LIST_TYPE = {
  [STATUS.NOT_CALLED]: LIST_TYPE.NORMAL,
  [STATUS.ABSENT]: LIST_TYPE.NORMAL,
  [STATUS.PROSPECT]: LIST_TYPE.PROSPECT,
  [STATUS.MATERIAL_SENT]: LIST_TYPE.PROSPECT,
  [STATUS.WON]: LIST_TYPE.WON,
  [STATUS.NG]: LIST_TYPE.NG,
};

/** 次回架電日の入力が必須となるステータス */
const STATUS_REQUIRES_NEXT_DATE = [STATUS.ABSENT, STATUS.PROSPECT];

/** 担当者の役割 */
const ROLE = {
  SALES: '営業',
  MANAGER: 'マネージャー',
};

/** 業種・従業員規模・月額プランの選択肢 */
const INDUSTRIES = ['IT', '不動産', '士業', '人材', '飲食本部', '広告・デザイン', 'コンサルティング', '教育・スクール', '建設・設計', '卸売・商社'];
const EMPLOYEE_SIZES = ['1-9', '10-49', '50-99', '100以上'];
const PLANS = ['ライト', 'スタンダード', 'プレミアム'];

/** トークスクリプトのステップ名 */
const SCRIPT_STEPS = ['受付突破', '担当者への挨拶', 'ヒアリング', '提案', 'クロージング'];

/** トークスクリプト・メールテンプレートで使える差し込み項目 */
const PLACEHOLDER = {
  COMPANY: '{会社名}',
  CONTACT: '{担当窓口}',
  OWNER: '{営業担当者}',
  MATERIAL: '{資料名}',   // メールテンプレートのみ
  SIGNATURE: '{署名}',    // メールテンプレートのみ(設定シートの署名に置き換え)
};

/** 設定シートのキーと初期値 */
const SETTING_KEY = {
  COMPANY_NAME: '会社名',
  SIGNATURE: '署名',
  DAILY_CALL_TARGET: '1日の架電目標件数',
  MAP_CENTER_LAT: '地図の初期中心(緯度)',
  MAP_CENTER_LNG: '地図の初期中心(経度)',
  MAP_DEFAULT_RADIUS_KM: '地図の初期半径(km)',
};

const DEFAULT_SETTINGS = [
  [SETTING_KEY.COMPANY_NAME, APP.COMPANY_NAME, '画面上部やメール署名に表示'],
  [SETTING_KEY.SIGNATURE, 'みどりのオフィス株式会社\n営業部 {営業担当者}\nTEL:03-0000-0000\nhttps://example.com', 'メール末尾の署名({営業担当者}を差し込み可能)'],
  [SETTING_KEY.DAILY_CALL_TARGET, 10, '1人あたりの1日の架電目標件数'],
  [SETTING_KEY.MAP_CENTER_LAT, 35.681236, '地図を開いたときの中心(緯度)'],
  [SETTING_KEY.MAP_CENTER_LNG, 139.767125, '地図を開いたときの中心(経度)'],
  [SETTING_KEY.MAP_DEFAULT_RADIUS_KM, 2, '半径検索の初期値(km)'],
];

/** 地図の半径スライダーの範囲(km) */
const MAP_RADIUS = { MIN: 0.5, MAX: 10, STEP: 0.5 };

/** AI切り返し提案の設定(スクリプトプロパティのキー名) */
const AI_PROVIDER = {
  MOCK: 'MOCK',
  CLAUDE: 'CLAUDE',
  GEMINI: 'GEMINI',
};

const PROP_KEY = {
  AI_PROVIDER: 'AI_PROVIDER',             // MOCK / CLAUDE / GEMINI(未設定時は MOCK)
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY', // CLAUDE モードで使用
  GEMINI_API_KEY: 'GEMINI_API_KEY',       // GEMINI モードで使用
  CLAUDE_MODEL: 'CLAUDE_MODEL',           // 任意。未設定時は AI_DEFAULT_MODEL.CLAUDE
  GEMINI_MODEL: 'GEMINI_MODEL',           // 任意。未設定時は AI_DEFAULT_MODEL.GEMINI
  SPREADSHEET_ID: 'SPREADSHEET_ID',       // Webアプリから参照するスプレッドシートID(setup() で自動保存)
};

/** AIモードの既定モデル(スクリプトプロパティ CLAUDE_MODEL / GEMINI_MODEL で変更可能) */
const AI_DEFAULT_MODEL = {
  CLAUDE: 'claude-opus-5-5',
  GEMINI: 'gemini-3.8-flash',
};

/** ID の接頭辞 */
const ID_PREFIX = {
  PROSPECT: 'PRS-',
  CUSTOMER: 'CUS-',
  HISTORY: 'HIS-',
};

/** ダミーデータで使うドメイン(実在しない例示用ドメイン) */
const DUMMY_EMAIL_DOMAIN = 'example.com';

/** ログシートの最大行数。超えたら古い行から LOG_TRIM_ROWS 行を削除する */
const LOG_MAX_ROWS = 2000;
const LOG_TRIM_ROWS = 500;

/** 排他制御の待ち時間(ミリ秒) */
const LOCK_TIMEOUT_MS = 10000;

/** 資料PDFの保存先フォルダ名(Googleドライブ) */
const MATERIAL_FOLDER_NAME = 'みどりのオフィス_デモ資料';

/**
 * スクリプトプロパティを取得する
 * @param {string} key
 * @return {string|null}
 */
function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * データ保存先のスプレッドシートを取得する
 * コンテナバインド(スプレッドシートから実行)の場合はそれを使い、
 * Webアプリ等で取得できない場合はスクリプトプロパティの ID から開く。
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet_() {
  // 公開デモは「このスクリプトが付いているスプレッドシート」しか開けない権限で動かす
  if (PUBLIC_DEMO_MODE) return SpreadsheetApp.getActiveSpreadsheet();
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = getProp_(PROP_KEY.SPREADSHEET_ID);
  if (!id) throw new Error('スプレッドシートが見つかりません。先に setup() を実行してください。');
  return SpreadsheetApp.openById(id);
}

/**
 * シート名からシートを取得する(存在しない場合はエラー)
 * @param {string} name
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('シート「' + name + '」が見つかりません。先に setup() を実行してください。');
  return sheet;
}

/**
 * ステータスからリスト区分を決定する
 * @param {string} status
 * @return {string}
 */
function listTypeOf_(status) {
  return STATUS_TO_LIST_TYPE[status] || LIST_TYPE.NORMAL;
}

/**
 * 設定シートを { 項目名: 値 } の形で取得する
 * @return {Object<string, *>}
 */
function getSettings_() {
  const sheet = getSheet_(SHEET.SETTINGS);
  const settings = {};
  DEFAULT_SETTINGS.forEach(function (r) { settings[r[0]] = r[1]; });
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().forEach(function (r) {
      if (r[COL.SETTING.KEY] !== '') settings[r[COL.SETTING.KEY]] = r[COL.SETTING.VALUE];
    });
  }
  return settings;
}

/**
 * 日付を文字列にする(画面に渡すときは Date ではなく文字列にする)
 * @param {Date|string} value
 * @param {string} pattern 例:'yyyy-MM-dd'
 * @return {string} 日付でなければ空文字
 */
function formatDate_(value, pattern) {
  if (!(value instanceof Date) || isNaN(value.getTime())) return '';
  return Utilities.formatDate(value, APP.TIMEZONE, pattern);
}

/** 今日の日付文字列(yyyy-MM-dd) */
function todayStr_() {
  return formatDate_(new Date(), 'yyyy-MM-dd');
}
