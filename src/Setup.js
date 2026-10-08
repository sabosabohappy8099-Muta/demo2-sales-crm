/**
 * Setup.js
 * 初期セットアップ(シート作成・マスタデータ登録・資料PDF生成)とメニュー、ログ出力。
 */

/** 営業担当者(架空)。メールアドレスは setup() 実行者のアドレスを全員に設定する */
const STAFF_SEED = [
  ['青木 翔太', ROLE.SALES],
  ['森川 美咲', ROLE.SALES],
  ['高野 大輔', ROLE.SALES],
  ['早瀬 ひかり', ROLE.SALES],
  ['桜井 浩二', ROLE.MANAGER],
];

/** トークスクリプト(5ステップ) */
const TALK_SCRIPT_SEED = [
  [1, SCRIPT_STEPS[0],
    'お忙しいところ恐れ入ります。わたくし、みどりのオフィス株式会社の{営業担当者}と申します。オフィス環境のご案内でお電話いたしました。{担当窓口}様はいらっしゃいますでしょうか。',
    '明るく、ややゆっくり。「営業です」ではなく「ご案内」と伝える。用件は短く、名指しで取り次ぎをお願いする。'],
  [2, SCRIPT_STEPS[1],
    '{担当窓口}様、突然のお電話失礼いたします。{会社名}様のオフィスに、観葉植物のレンタルをご案内しているみどりのオフィスの{営業担当者}です。1分ほどだけお時間よろしいでしょうか。',
    '「1分だけ」と時間を区切って許可をもらう。相手の反応が硬ければ、すぐに要点だけ話す。'],
  [3, SCRIPT_STEPS[2],
    '現在、{会社名}様のオフィスにグリーン(観葉植物)は置かれていますか? 受付や会議室の印象、社員の方がひと息つけるスペースなどで、気になっている点はございますか?',
    '「はい/いいえ」で終わらない質問で、相手に話してもらう。出てきた悩みはメモ欄に書き留める。'],
  [4, SCRIPT_STEPS[3],
    '弊社では、鉢の設置から水やり・入れ替えまで、月1回のメンテナンス込みで月額5,500円からご利用いただけます。枯れてしまった場合も無料で交換しますので、お手入れの手間はかかりません。{会社名}様の近くでも、多くの企業様にご導入いただいています。',
    '地図検索で「近隣の導入企業数」を確認し、具体的な数字で伝えると説得力が増す。'],
  [5, SCRIPT_STEPS[4],
    'まずは無料でオフィスを拝見し、レイアウトに合わせたプランをお作りします。来週の火曜日か木曜日で、ご都合のよい日はございますか? 難しければ、先に資料をメールでお送りいたします。',
    '日程は二択で聞く。断られたら資料送付を提案し、必ず次回架電日を決めてから電話を切る。'],
];

/** 切り返し集(断り文句の分類・判定キーワード・切り返しトーク・次のアクション) */
const REBUTTAL_SEED = [
  ['間に合っている', '間に合って,結構です,必要ない,いらない,要らない,大丈夫です,興味ない',
    'ありがとうございます。皆さま最初はそうおっしゃるのですが、実際に置いてみると「来客の印象が変わった」「会議室の雰囲気が明るくなった」とのお声を多くいただいています。1か月だけのお試しもできますので、まずは資料だけでもご覧いただけませんか?',
    '資料送付を提案'],
  ['予算がない', '予算,高い,お金,コスト,費用,経費,値段',
    'ご予算は大切ですよね。ライトプランは月額5,500円からで、1日あたり約180円です。メンテナンスや枯れた際の交換費用もすべて含まれていますので、追加の費用はかかりません。料金表をお送りしてもよろしいでしょうか?',
    '料金プラン表を送付'],
  ['忙しい', '忙しい,時間がない,今ちょっと,手が離せない,後にして,バタバタ,会議中',
    'お忙しいところ失礼いたしました。改めてお電話させていただきたいのですが、午前と午後でしたら、どちらのお時間帯がご都合よろしいでしょうか?',
    '次回架電日を設定'],
  ['資料だけ送って', '資料,メールで,送って,パンフレット,カタログ',
    'かしこまりました。{会社名}様に合った資料をお送りしたいので、2点だけ教えてください。オフィスの広さはおおよそどのくらいでしょうか? また、受付・会議室・執務スペースのどこに置くイメージが近いでしょうか?',
    '資料送付+3日後に再架電'],
  ['上に確認しないと', '上司,社長,確認,決裁,相談,上の者,稟議',
    'ありがとうございます。ご検討いただく際にお役立ていただけるよう、料金と導入事例をまとめた資料をお送りします。決裁者の方もご一緒に、15分ほどオンラインでご説明する機会をいただくことは可能でしょうか?',
    '資料送付し、決裁者との打合せを打診'],
  ['他社を使っている', '他社,別の会社,もう使って,契約している,既に,すでに,入っている',
    'すでにご利用中なのですね。比較材料として、弊社の料金とメンテナンス内容をご覧いただくだけでも構いません。差し支えなければ、現在のご契約の更新時期はいつ頃でしょうか?',
    '契約更新時期を確認し、次回架電日を設定'],
  ['手入れが大変', '枯れ,手入れ,水やり,虫,面倒,管理,世話',
    'ご安心ください。月1回、専任のスタッフが水やり・剪定・入れ替えまで行いますので、社員の皆さまのお手間は一切かかりません。虫が出にくい土を使った鉢もご用意しています。',
    'ヒアリングに戻り設置場所を確認'],
  ['置く場所がない', '場所,狭い,スペース,置けない,置き場',
    '卓上サイズの小さな鉢や、壁に掛けるタイプもございます。床を使わずに設置できますので、限られたスペースでも大丈夫です。無料でオフィスを拝見して、置ける場所をご提案することもできます。',
    '無料の現地調査を提案'],
  ['移転・改装の予定がある', '移転,引っ越し,改装,リニューアル,工事,レイアウト変更',
    '移転やリニューアルは、グリーンを取り入れる絶好のタイミングです。新しいオフィスのレイアウトに合わせてプランをお作りできますので、移転のご予定時期を教えていただけますか?',
    '移転時期を確認し、次回架電日を設定'],
  ['担当者が分からない', '担当者,分からない,わからない,誰が,部署,担当がいない',
    '承知いたしました。オフィスの備品や環境づくりは、総務や管理部門のご担当の方が多いのですが、そちらの方にお繋ぎいただくことは可能でしょうか?',
    '担当部署を確認して取り次ぎを依頼'],
];

/** 紹介資料(Googleドキュメントから生成するPDF)とメールテンプレート */
const MATERIAL_SEED = [
  {
    name: 'サービス紹介資料',
    subject: '【みどりのオフィス】観葉植物レンタルのご案内({会社名}様)',
    body: '{会社名}\n{担当窓口} 様\n\nお世話になっております。\nみどりのオフィス株式会社の{営業担当者}です。\n\n先ほどはお忙しいところお時間をいただき、ありがとうございました。\nお話しした観葉植物レンタルの「{資料名}」をお送りいたします。\n\n・鉢の設置からメンテナンスまで月額5,500円から\n・枯れた場合も無料で交換\n・オフィスの無料下見とプランのご提案が可能です\n\nご不明な点がございましたら、お気軽にご連絡ください。\n\n{署名}',
    doc: {
      title: '観葉植物レンタル サービス紹介',
      sections: [
        ['オフィスに、緑のある毎日を', 'みどりのオフィス株式会社は、法人向けに観葉植物のレンタルサービスを提供しています(本資料はデモ用の架空の内容です)。'],
        ['サービスの特長', '・鉢の選定から設置、月1回のメンテナンスまですべておまかせ\n・枯れた場合や季節に合わせた入れ替えも無料\n・受付、会議室、執務スペースなど場所に合わせてご提案'],
        ['導入の流れ', '1. お問い合わせ・無料の現地下見\n2. レイアウトに合わせたプランのご提案\n3. 設置(最短1週間)\n4. 月1回の定期メンテナンス'],
      ],
    },
  },
  {
    name: '料金プラン表',
    subject: '【みどりのオフィス】料金プランのご案内({会社名}様)',
    body: '{会社名}\n{担当窓口} 様\n\nお世話になっております。\nみどりのオフィス株式会社の{営業担当者}です。\n\nご要望いただいた「{資料名}」をお送りいたします。\nメンテナンス費用・交換費用はすべて月額料金に含まれております。\n\n御社のオフィスに合わせたお見積もりも無料で作成いたしますので、ぜひお申し付けください。\n\n{署名}',
    doc: {
      title: '料金プラン表',
      sections: [
        ['ライトプラン 月額5,500円〜', '卓上〜中型の鉢 3〜8鉢。受付や小規模オフィス向け。'],
        ['スタンダードプラン 月額16,500円〜', '中型〜大型の鉢 8〜20鉢。会議室や執務スペースまでカバー。'],
        ['プレミアムプラン 月額44,000円〜', '20鉢以上+壁面グリーンなどの空間演出。エントランスやラウンジに。'],
        ['すべてのプランに含まれるもの', '・月1回の定期メンテナンス(水やり・剪定・清掃)\n・枯れた場合の無料交換\n・季節ごとの入れ替え相談'],
      ],
    },
  },
  {
    name: '導入事例集',
    subject: '【みどりのオフィス】導入事例のご紹介({会社名}様)',
    body: '{会社名}\n{担当窓口} 様\n\nお世話になっております。\nみどりのオフィス株式会社の{営業担当者}です。\n\n実際にご導入いただいた企業様の事例をまとめた「{資料名}」をお送りいたします。\n同じ規模・業種の事例もございますので、ご検討の参考になれば幸いです。\n\n{署名}',
    doc: {
      title: '導入事例集',
      sections: [
        ['事例1:IT企業(従業員50名)', 'エントランスと会議室に12鉢を設置。「来客から雰囲気が良いと言われるようになった」との声。※架空の事例です'],
        ['事例2:不動産会社(従業員20名)', '店舗の受付カウンターに卓上グリーンを設置。物件案内の待ち時間の印象が向上。※架空の事例です'],
        ['事例3:人材会社(従業員120名)', '執務フロアに30鉢+壁面グリーン。社員アンケートで「リフレッシュできる」が増加。※架空の事例です'],
      ],
    },
  },
];

/**
 * スプレッドシートを開いたときにメニューを追加する
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🌿 CRMデモ')
    .addItem('初期セットアップ', 'setup')
    .addItem('ダミーデータを生成', 'generateDummyData')
    .addSeparator()
    .addItem('ダミーデータを削除', 'menuClearDummyData')
    .addToUi();
}

/**
 * 初期セットアップ
 * 既にあるシート・データは作り直さず、足りないものだけを作成する。
 */
function setup() {
  try {
    const ss = getSpreadsheet_();
    const props = PropertiesService.getScriptProperties();
    props.setProperty(PROP_KEY.SPREADSHEET_ID, ss.getId());
    if (!props.getProperty(PROP_KEY.AI_PROVIDER)) {
      props.setProperty(PROP_KEY.AI_PROVIDER, AI_PROVIDER.MOCK);
    }

    createSheets_(ss);
    seedSettings_();
    seedStaff_();
    seedIfEmpty_(SHEET.TALK_SCRIPT, TALK_SCRIPT_SEED);
    seedIfEmpty_(SHEET.REBUTTALS, REBUTTAL_SEED);
    seedMaterials_();
    removeDefaultSheet_(ss);

    writeLog_('setup', '成功', '');
    toast_('初期セットアップが完了しました');
  } catch (e) {
    writeLog_('setup', '失敗', e.message);
    throw e;
  }
}

/**
 * 必要なシートと見出し行を作成する(既にあれば何もしない)
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function createSheets_(ss) {
  Object.keys(HEADERS).forEach(function (name) {
    if (ss.getSheetByName(name)) return;
    const headers = HEADERS[name];
    const sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight('bold')
      .setBackground('#e8f5e9');
    sheet.setFrozenRows(1);
    formatSheet_(sheet, name);
  });
}

/**
 * シートごとの書式(表示形式・入力規則・列幅)を設定する
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} name
 */
function formatSheet_(sheet, name) {
  const rows = sheet.getMaxRows() - 1;
  const P = COL.PROSPECT;
  switch (name) {
    case SHEET.PROSPECTS:
      // 「1-9」が日付に、電話番号の先頭0が消えるのを防ぐため文字列にする
      sheet.getRange(2, P.SIZE + 1, rows, 1).setNumberFormat('@');
      sheet.getRange(2, P.PHONE + 1, rows, 1).setNumberFormat('@');
      sheet.getRange(2, P.NEXT_CALL_DATE + 1, rows, 1).setNumberFormat('yyyy/MM/dd');
      sheet.getRange(2, P.LAST_CALLED_AT + 1, rows, 1).setNumberFormat('yyyy/MM/dd HH:mm');
      sheet.getRange(2, P.STATUS + 1, rows, 1).setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(STATUS_LIST, true).build());
      sheet.setColumnWidth(P.COMPANY + 1, 220);
      sheet.setColumnWidth(P.ADDRESS + 1, 280);
      break;
    case SHEET.CUSTOMERS:
      sheet.getRange(2, COL.CUSTOMER.START_DATE + 1, rows, 1).setNumberFormat('yyyy/MM/dd');
      sheet.setColumnWidth(COL.CUSTOMER.COMPANY + 1, 220);
      sheet.setColumnWidth(COL.CUSTOMER.ADDRESS + 1, 280);
      break;
    case SHEET.CALL_HISTORY:
      sheet.getRange(2, COL.HISTORY.DATETIME + 1, rows, 1).setNumberFormat('yyyy/MM/dd HH:mm');
      sheet.setColumnWidth(COL.HISTORY.COMPANY + 1, 220);
      sheet.setColumnWidth(COL.HISTORY.MEMO + 1, 300);
      break;
    case SHEET.TALK_SCRIPT:
    case SHEET.REBUTTALS:
    case SHEET.MATERIALS:
      sheet.setColumnWidths(2, 3, 320);
      sheet.getRange(2, 1, rows, 4).setWrap(true).setVerticalAlignment('top');
      break;
    case SHEET.SETTINGS:
      sheet.setColumnWidths(1, 3, 240);
      break;
    case SHEET.LOG:
      sheet.getRange(2, COL.LOG.DATETIME + 1, rows, 1).setNumberFormat('yyyy/MM/dd HH:mm:ss');
      sheet.setColumnWidth(COL.LOG.ERROR + 1, 400);
      break;
  }
}

/**
 * 見出し行以外にデータが無いときだけ、行データを書き込む
 * @param {string} sheetName
 * @param {Array<Array<*>>} rows
 * @return {boolean} 書き込んだ場合 true
 */
function seedIfEmpty_(sheetName, rows) {
  const sheet = getSheet_(sheetName);
  if (sheet.getLastRow() > 1 || rows.length === 0) return false;
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return true;
}

/** 設定シートに初期値を登録する(未登録の項目だけ追加) */
function seedSettings_() {
  const sheet = getSheet_(SHEET.SETTINGS);
  const existing = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; })
    : [];
  const rows = DEFAULT_SETTINGS.filter(function (r) { return existing.indexOf(r[0]) === -1; });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
}

/** 担当者を登録する(メールアドレスは実行者のアドレス) */
function seedStaff_() {
  const email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  const rows = STAFF_SEED.map(function (s) { return [s[0], email, s[1]]; });
  seedIfEmpty_(SHEET.STAFF, rows);
}

/**
 * 紹介資料のPDFを生成してドライブに保存し、資料シートに登録する
 * 資料シートに既にデータがあれば何もしない(PDFの重複作成を防ぐ)。
 */
function seedMaterials_() {
  const sheet = getSheet_(SHEET.MATERIALS);
  if (sheet.getLastRow() > 1) return;

  const folder = getOrCreateFolder_(MATERIAL_FOLDER_NAME);
  const rows = MATERIAL_SEED.map(function (m) {
    const fileId = createMaterialPdf_(m, folder);
    return [m.name, fileId, m.subject, m.body];
  });
  sheet.getRange(2, 1, rows.length, 4).setValues(rows);
}

/**
 * Googleドキュメントで資料を作り、PDFに変換して保存する
 * 変換後の元ドキュメントはゴミ箱に移動する。
 * @param {Object} material MATERIAL_SEED の要素
 * @param {GoogleAppsScript.Drive.Folder} folder
 * @return {string} PDFのファイルID
 */
function createMaterialPdf_(material, folder) {
  const doc = DocumentApp.create(material.name + '(作業用)');
  const body = doc.getBody();
  body.appendParagraph(material.doc.title).setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph(APP.COMPANY_NAME + '(架空の会社です)').setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  material.doc.sections.forEach(function (sec) {
    body.appendParagraph(sec[0]).setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(sec[1]);
  });
  body.appendParagraph('');
  body.appendParagraph('※本資料はポートフォリオ用デモのために作成した架空の資料です。')
    .setItalic(true).setFontSize(9);
  doc.saveAndClose();

  const docFile = DriveApp.getFileById(doc.getId());
  const pdf = folder.createFile(docFile.getAs(MimeType.PDF).setName(material.name + '.pdf'));
  docFile.setTrashed(true);
  return pdf.getId();
}

/**
 * マイドライブ直下のフォルダを名前で取得し、無ければ作成する
 * @param {string} name
 * @return {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateFolder_(name) {
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

/**
 * 新規スプレッドシートに最初からある空のシート(シート1 / Sheet1)を削除する
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 */
function removeDefaultSheet_(ss) {
  ['シート1', 'Sheet1'].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sheet);
  });
}

/**
 * ログシートに1行追記する(ログ出力の失敗で本処理を止めない)
 * @param {string} process 処理名
 * @param {string} result 結果(成功/失敗/フォールバック など)
 * @param {string} error エラー内容
 */
function writeLog_(process, result, error) {
  try {
    const sheet = getSpreadsheet_().getSheetByName(SHEET.LOG);
    if (sheet) {
      sheet.appendRow([new Date(), process, result, String(error || '').slice(0, 1000)]);
      // ログが増えすぎないよう、古い行から削除する
      if (sheet.getLastRow() > LOG_MAX_ROWS) sheet.deleteRows(2, LOG_TRIM_ROWS);
    }
  } catch (e) {
    console.error('ログ出力に失敗しました: ' + e.message);
  }
  if (error) console.error(process + ': ' + error);
}

/**
 * スプレッドシート上にトースト通知を出す(エディタから実行した場合はログのみ)
 * @param {string} message
 */
function toast_(message) {
  console.log(message);
  try {
    getSpreadsheet_().toast(message, APP.TOOL_NAME, 5);
  } catch (e) {
    // 画面が無い実行環境では表示しない
  }
}

/** メニューから削除するときは確認ダイアログを出す */
function menuClearDummyData() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert('確認', '見込み客・導入企業・架電履歴のデータをすべて削除します。よろしいですか?', ui.ButtonSet.OK_CANCEL);
  if (res === ui.Button.OK) clearDummyData();
}
