/**
 * MailService.js
 * 資料のメール送付(Gmailの下書き保存/今すぐ送信)。
 * 送付したら見込み客を「資料送付済み」にし、架電履歴に記録する。
 */

/** 送付方法 */
const MAIL_MODE = {
  DRAFT: 'draft', // Gmailの下書きに保存(初期値。誤送信防止)
  SEND: 'send',   // 今すぐ送信
};

/**
 * 資料シートを取得する
 * @return {{name: string, fileId: string, subject: string, body: string}[]}
 */
function getMaterials_() {
  const sheet = getSheet_(SHEET.MATERIALS);
  if (sheet.getLastRow() < 2) return [];
  const M = COL.MATERIAL;
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS[SHEET.MATERIALS].length).getValues()
    .filter(function (r) { return r[M.NAME] !== ''; })
    .map(function (r) {
      return { name: String(r[M.NAME]), fileId: String(r[M.FILE_ID]), subject: String(r[M.SUBJECT]), body: String(r[M.BODY]) };
    });
}

/**
 * 見込み客に合わせて、差し込み済みのメール(件名・本文)を資料ごとに作る
 * @param {Object} prospect
 * @param {string} staffName
 * @return {{name: string, subject: string, body: string}[]}
 */
function buildMaterialMails_(prospect, staffName) {
  const values = placeholderValues_(prospect, staffName);
  const signature = fillPlaceholders_(getSettings_()[SETTING_KEY.SIGNATURE] || '', values);
  return getMaterials_().map(function (m) {
    const v = Object.assign({}, values);
    v[PLACEHOLDER.MATERIAL] = m.name;
    v[PLACEHOLDER.SIGNATURE] = signature;
    return { name: m.name, subject: fillPlaceholders_(m.subject, v), body: fillPlaceholders_(m.body, v) };
  });
}

/**
 * 資料を送付する(下書き保存または送信)し、見込み客と架電履歴を更新する
 * - 架電結果をまだ保存していない場合:「資料送付済み」で架電結果の保存を兼ねる
 * - 保存済みの場合(historyId あり):その履歴の行を「資料送付済み」に書き換え、送付内容をメモに追記する
 * @param {{prospectId: string, staffName: string, materialName: string, to: string, subject: string, body: string,
 *          mode: string, historyId: string, memo: string, nextCallDate: string, rebuttal: string}} input
 * @return {{prospect: Object, history: Object, mode: string, redirected: boolean, updatedHistory: boolean}}
 */
function sendMaterial_(input) {
  const material = getMaterials_().filter(function (m) { return m.name === input.materialName; })[0];
  if (!material) throw new Error('資料「' + input.materialName + '」が見つかりません。');
  const to = String(input.to || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('送信先のメールアドレスが正しくありません。');
  const subject = String(input.subject || '').trim();
  const body = String(input.body || '');
  if (!subject || !body.trim()) throw new Error('件名と本文を入力してください。');
  const mode = input.mode === MAIL_MODE.SEND ? MAIL_MODE.SEND : MAIL_MODE.DRAFT;

  // 先にメールを処理し、失敗したら何も記録しない
  const mail = deliverMail_(to, subject, body, material, mode);
  const note = '【資料送付】' + material.name + '(' + (mode === MAIL_MODE.SEND ? 'メール送信' : 'Gmail下書き') + ')';

  const result = withLock_(function () {
    if (input.historyId) {
      // 架電結果の保存後に送付した場合:同じ電話の履歴として1行にまとめる
      const current = getProspect_(input.prospectId);
      // 成約済みの会社はステータスを戻さない
      const status = current.status === STATUS.WON ? STATUS.WON : STATUS.MATERIAL_SENT;
      const history = updateHistoryRow_(input.historyId, function (h) {
        return { RESULT: status, MEMO: h.memo ? h.memo + '\n' + note : note };
      });
      const prospect = applyProspectUpdate_(input.prospectId, function () { return { STATUS: status }; });
      return { prospect: prospect, history: history, updatedHistory: true };
    }
    const memo = String(input.memo || '').trim();
    const recorded = recordCall_({
      prospectId: input.prospectId,
      staffName: input.staffName,
      status: STATUS.MATERIAL_SENT,
      memo: memo ? memo + '\n' + note : note,
      nextCallDate: parseDateInput_(input.nextCallDate),
      rebuttal: String(input.rebuttal || '').trim(),
    });
    recorded.updatedHistory = false;
    return recorded;
  });

  result.mode = mode;
  result.redirected = mail.redirected;
  result.demo = Boolean(mail.demo);
  writeLog_('sendMaterial', '成功', '');
  return result;
}

/**
 * Gmail の下書きを作る、または送信する(資料PDFを添付)
 * 今すぐ送信で送信先が example.com の場合は、デモ用に実行ユーザー自身のアドレスへ送る。
 * @param {string} to
 * @param {string} subject
 * @param {string} body
 * @param {{name: string, fileId: string}} material
 * @param {string} mode
 * @return {{redirected: boolean}}
 */
function deliverMail_(to, subject, body, material, mode) {
  // 公開デモでは送らず、Gmail の下書きも作らない。ドライブの資料も読まない
  if (PUBLIC_DEMO_MODE) {
    const kind = mode === MAIL_MODE.DRAFT ? '資料の下書き' : '資料の送付';
    recordDemoMail_(kind, to, subject, body + '\n\n[添付] ' + material.name + '.pdf');
    return { redirected: false, demo: true };
  }
  let attachment;
  try {
    attachment = DriveApp.getFileById(material.fileId).getBlob();
  } catch (e) {
    throw new Error('資料「' + material.name + '」のPDFが見つかりません。資料シートのファイルIDを確認してください。');
  }
  const options = {
    attachments: [attachment],
    name: String(getSettings_()[SETTING_KEY.COMPANY_NAME] || APP.COMPANY_NAME),
  };

  if (mode === MAIL_MODE.DRAFT) {
    GmailApp.createDraft(to, subject, body, options);
    return { redirected: false };
  }

  const redirected = isDummyAddress_(to);
  if (redirected) {
    const self = Session.getEffectiveUser().getEmail();
    body = '※デモのため、本来の宛先(' + to + ')ではなく、このアドレスに送信しています。\n\n' + body;
    to = self;
  }
  GmailApp.sendEmail(to, subject, body, options);
  return { redirected: redirected };
}

/**
 * ダミーデータのアドレス(example.com)かどうか
 * @param {string} email
 * @return {boolean}
 */
function isDummyAddress_(email) {
  const domain = String(email).split('@')[1] || '';
  return domain.toLowerCase() === DUMMY_EMAIL_DOMAIN || /\.example\.com$/i.test(domain);
}
