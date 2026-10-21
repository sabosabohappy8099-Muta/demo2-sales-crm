/**
 * AiService.js
 * 相手の言葉から最適な切り返しを提案する。
 * モードはスクリプトプロパティ AI_PROVIDER で切り替える(MOCK / CLAUDE / GEMINI)。
 * CLAUDE / GEMINI は、APIキーが未設定・呼び出し失敗・想定外の応答のときに MOCK へフォールバックし、ログに記録する。
 * APIキーはスクリプトプロパティ(ANTHROPIC_API_KEY / GEMINI_API_KEY)にのみ保存し、コードやログには残さない。
 */

/** AIが「どの分類にも当てはまらない」と判断したときの値 */
const AI_NO_MATCH = '該当なし';

/**
 * 切り返しを提案する
 * @param {string} text 相手の言葉
 * @param {Object} prospect 見込み客
 * @param {string} staffName 架電中の営業担当者
 * @return {{found: boolean, category: string, talk: string, nextAction: string, matched: string[], provider: string, note: string}}
 */
function suggestRebuttal_(text, prospect, staffName) {
  // 公開デモでは API を使わない(費用がかからず、外部への通信の権限も持たせない)
  const provider = PUBLIC_DEMO_MODE ? AI_PROVIDER.MOCK
    : String(getProp_(PROP_KEY.AI_PROVIDER) || AI_PROVIDER.MOCK).trim().toUpperCase();
  if (provider !== AI_PROVIDER.CLAUDE && provider !== AI_PROVIDER.GEMINI) {
    return mockSuggest_(text, prospect, staffName);
  }

  try {
    return aiSuggest_(provider, text, prospect, staffName);
  } catch (e) {
    writeLog_('suggestRebuttal', 'フォールバック', provider + ' → MOCK: ' + e.message);
    const result = mockSuggest_(text, prospect, staffName);
    result.note = 'AI(' + provider + ')を使えなかったため、キーワード判定で表示しています';
    return result;
  }
}

/**
 * CLAUDE / GEMINI モード:切り返し集を参考に、AIが分類を選び、相手の言葉に合わせたトークを作る
 * @param {string} provider
 * @param {string} text
 * @param {Object} prospect
 * @param {string} staffName
 * @return {Object}
 */
function aiSuggest_(provider, text, prospect, staffName) {
  const values = placeholderValues_(prospect, staffName);
  const rebuttals = getRebuttals_().map(function (r) {
    return { category: r.category, talk: fillPlaceholders_(r.talk, values), nextAction: r.nextAction };
  });
  if (!rebuttals.length) throw new Error('切り返し集が空です');
  const prompt = buildRebuttalPrompt_(text, prospect, staffName, rebuttals);
  const categories = rebuttals.map(function (r) { return r.category; }).concat([AI_NO_MATCH]);

  const answer = provider === AI_PROVIDER.CLAUDE
    ? callClaude_(prompt, categories)
    : callGemini_(prompt, categories);

  if (!answer || categories.indexOf(answer.category) === -1) {
    throw new Error('想定外の応答です: ' + JSON.stringify(answer).slice(0, 200));
  }
  if (answer.category === AI_NO_MATCH) {
    return { found: false, category: '', talk: '', nextAction: '', matched: [], provider: provider, note: String(answer.reason || '') };
  }
  const base = rebuttals.filter(function (r) { return r.category === answer.category; })[0];
  return {
    found: true,
    category: answer.category,
    talk: String(answer.talk || '').trim() || base.talk,
    nextAction: String(answer.nextAction || '').trim() || base.nextAction,
    matched: [],
    provider: provider,
    note: '🤖 ' + provider + ' の提案' + (answer.reason ? ':' + answer.reason : ''),
  };
}

/**
 * AIへの指示文を作る
 * @return {{system: string, user: string}}
 */
function buildRebuttalPrompt_(text, prospect, staffName, rebuttals) {
  const system = [
    'あなたは、法人向けに観葉植物のレンタルを行う「' + APP.COMPANY_NAME + '」の電話営業を支援するアシスタントです。',
    '営業担当者が通話中に、相手(見込み客の企業の担当者)が言った断り文句や反応を入力します。',
    '下の「切り返し集」から最も当てはまる分類を1つ選び、相手の言葉に合わせて言い換えた切り返しトークを作ってください。',
    '',
    '# トークの条件',
    '- 営業担当者がそのまま読み上げられる、丁寧で自然な話し言葉にする(2〜4文、150字程度まで)',
    '- 相手の言葉をいったん受け止めてから提案する。押し売りや、相手を否定する言い方はしない',
    '- 料金・サービス内容などの事実は、切り返し集に書かれている範囲だけを使う。新しい数字・実績・社名を作らない',
    '- どの分類にも当てはまらない場合は category を「' + AI_NO_MATCH + '」にし、talk と nextAction は空文字にする',
    '- reason には、その分類を選んだ理由を20字程度で書く',
    '',
    '# 切り返し集(分類/参考トーク/次のアクション)',
    rebuttals.map(function (r) {
      return '## ' + r.category + '\n参考トーク:' + r.talk + '\n次のアクション:' + r.nextAction;
    }).join('\n\n'),
  ].join('\n');

  const user = [
    '# 架電先',
    '会社名:' + prospect.company,
    '業種:' + prospect.industry + '/従業員規模:' + prospect.size + '名',
    '営業担当者:' + staffName,
    '',
    '# 相手の言葉',
    text,
  ].join('\n');

  return { system: system, user: user };
}

/** AIの回答の形(JSON Schema) */
function rebuttalAnswerSchema_(categories) {
  return {
    type: 'object',
    properties: {
      category: { type: 'string', enum: categories },
      talk: { type: 'string' },
      nextAction: { type: 'string' },
      reason: { type: 'string' },
    },
    required: ['category', 'talk', 'nextAction', 'reason'],
    additionalProperties: false,
  };
}

/**
 * Anthropic API(Claude)を呼び出す
 * 安全性の判定で応答が止まった場合に備え、サーバー側のフォールバック(fallbacks: "default")を有効にしている。
 * @param {{system: string, user: string}} prompt
 * @param {string[]} categories
 * @return {Object} AIの回答(JSON)
 */
function callClaude_(prompt, categories) {
  const key = getProp_(PROP_KEY.ANTHROPIC_API_KEY);
  if (!key) throw new Error('スクリプトプロパティ ANTHROPIC_API_KEY が未設定です');

  const body = {
    model: getProp_(PROP_KEY.CLAUDE_MODEL) || AI_DEFAULT_MODEL.CLAUDE,
    max_tokens: 16000,
    fallbacks: 'default',
    // 通話中に使うため、考える量を抑えて速く返す
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: rebuttalAnswerSchema_(categories) },
    },
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }],
  };
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });

  const json = parseApiResponse_(res, 'Claude');
  if (json.stop_reason === 'refusal') throw new Error('Claude が応答を控えました');
  if (json.stop_reason === 'max_tokens') throw new Error('Claude の応答が途中で切れました');
  const textBlock = (json.content || []).filter(function (b) { return b.type === 'text'; })[0];
  if (!textBlock) throw new Error('Claude の応答に本文がありません');
  return JSON.parse(textBlock.text);
}

/**
 * Google Gemini API を呼び出す
 * @param {{system: string, user: string}} prompt
 * @param {string[]} categories
 * @return {Object} AIの回答(JSON)
 */
function callGemini_(prompt, categories) {
  const key = getProp_(PROP_KEY.GEMINI_API_KEY);
  if (!key) throw new Error('スクリプトプロパティ GEMINI_API_KEY が未設定です');

  const model = getProp_(PROP_KEY.GEMINI_MODEL) || AI_DEFAULT_MODEL.GEMINI;
  const body = {
    systemInstruction: { parts: [{ text: prompt.system }] },
    contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: categories },
          talk: { type: 'STRING' },
          nextAction: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['category', 'talk', 'nextAction', 'reason'],
      },
    },
  };
  const res = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'post',
      contentType: 'application/json',
      // キーはURLに含めず、ヘッダーで渡す(ログ等にURLが残っても漏れないように)
      headers: { 'x-goog-api-key': key },
      payload: JSON.stringify(body),
      muteHttpExceptions: true,
    });

  const json = parseApiResponse_(res, 'Gemini');
  const candidate = (json.candidates || [])[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  if (!parts || !parts.length) {
    throw new Error('Gemini の応答に本文がありません' + (candidate && candidate.finishReason ? '(' + candidate.finishReason + ')' : ''));
  }
  return JSON.parse(parts.map(function (p) { return p.text || ''; }).join(''));
}

/**
 * APIの応答を確認してJSONにする(失敗時はステータスとエラー内容の要約を含めて例外にする)
 * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} res
 * @param {string} name
 * @return {Object}
 */
function parseApiResponse_(res, name) {
  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code < 200 || code >= 300) {
    let detail = text.slice(0, 200);
    try {
      const err = JSON.parse(text).error;
      if (err && err.message) detail = String(err.message).slice(0, 200);
    } catch (e) {
      // JSON でなければ本文の先頭をそのまま使う
    }
    throw new Error(name + ' API エラー(HTTP ' + code + '):' + detail);
  }
  return JSON.parse(text);
}

/**
 * MOCK モード:切り返し集の判定キーワードとの一致で選ぶ
 * 一致したキーワードの文字数の合計が最も大きい分類を採用する(長いキーワードほど具体的とみなす)。
 * @param {string} text
 * @param {Object} prospect
 * @param {string} staffName
 * @return {Object}
 */
function mockSuggest_(text, prospect, staffName) {
  const normalized = normalizeForMatch_(text);
  const values = placeholderValues_(prospect, staffName);
  let best = null;

  getRebuttals_().forEach(function (r) {
    const matched = r.keywords.filter(function (k) {
      return normalized.indexOf(normalizeForMatch_(k)) !== -1;
    });
    const score = matched.reduce(function (sum, k) { return sum + k.length; }, 0);
    if (score > 0 && (!best || score > best.score)) best = { rebuttal: r, matched: matched, score: score };
  });

  if (!best) {
    return { found: false, category: '', talk: '', nextAction: '', matched: [], provider: AI_PROVIDER.MOCK, note: '' };
  }
  return {
    found: true,
    category: best.rebuttal.category,
    talk: fillPlaceholders_(best.rebuttal.talk, values),
    nextAction: best.rebuttal.nextAction,
    matched: best.matched,
    provider: AI_PROVIDER.MOCK,
    note: '',
  };
}

/**
 * キーワード判定用に文字をそろえる(全角英数→半角、カタカナ→ひらがな、空白除去、小文字化)
 * @param {string} text
 * @return {string}
 */
function normalizeForMatch_(text) {
  return String(text || '')
    .replace(/[A-Za-z0-9]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
    .replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); })
    .replace(/\s+/g, '')
    .toLowerCase();
}
