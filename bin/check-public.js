// 公開デモの版を確かめる(bin/build-public.sh から自動で実行する)
// - 資料のメールを送っても・下書きにしても Gmail もドライブも呼ばれず、「送信記録(デモ)」に残ること
// - AI の API を設定していても MOCK になること
// 実行:node bin/check-public.js build/public
const fs = require("fs");
const vm = require("vm");

const dir = process.argv[2] || "build/public";
const forbidden = [];
const ctx = {
  console,
  GmailApp: { sendEmail: () => forbidden.push("Gmail 送信"), createDraft: () => forbidden.push("Gmail 下書き") },
  DriveApp: { getFileById: () => { forbidden.push("ドライブ"); return { getBlob: () => ({}) }; } },
  UrlFetchApp: { fetch: () => { forbidden.push("外部通信"); throw new Error("通信"); } },
  Session: { getEffectiveUser: () => ({ getEmail: () => forbidden.push("メールアドレス") }) },
};
vm.createContext(ctx);
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  vm.runInContext(fs.readFileSync(`${dir}/${file}`, "utf8"), ctx, { filename: file });
}
vm.runInContext(`
  var __recorded = [];
  recordDemoMail_ = function (kind, to) { __recorded.push([kind, to]); };
  getSettings_ = function () { return {}; };
  getProp_ = function () { return "CLAUDE"; };
  writeLog_ = function () {};
  getRebuttals_ = function () { return []; };
  deliverMail_("customer@example.com", "件名", "本文", { name: "資料", fileId: "x" }, MAIL_MODE.DRAFT);
  deliverMail_("customer@example.com", "件名", "本文", { name: "資料", fileId: "x" }, "send");
  var __ai = suggestRebuttal_("今は忙しいので", { company: "架空の会社" }, "担当者");
`, ctx);

const errors = [];
if (!vm.runInContext("PUBLIC_DEMO_MODE", ctx)) errors.push("PUBLIC_DEMO_MODE が true ではありません");
if (forbidden.length > 0) errors.push(`使ってはいけない機能が呼ばれました:${forbidden.join("、")}`);
if (vm.runInContext("__recorded.length", ctx) !== 2) errors.push("送信記録に2件残っていません");
if (vm.runInContext("__ai.provider", ctx) !== "MOCK") errors.push("AI が MOCK になっていません");

if (errors.length > 0) {
  console.error("公開デモの確認で問題が見つかりました:\n- " + errors.join("\n- "));
  process.exit(1);
}
console.log("公開デモの確認:OK(Gmail・ドライブ・外部通信は呼ばれない・送信記録に残る・AI は MOCK)");
