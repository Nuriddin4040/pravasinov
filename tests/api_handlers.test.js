// Проверка обработчиков API: не должны падать, всегда отвечают ожидаемо,
// и статистика действительно считается (через store.js, в памяти без Redis).
function mockRes() {
  const res = { statusCode: 200, body: null, headers: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}

async function main() {
  process.env.TELEGRAM_BOT_TOKEN = "test_token_not_real";
  const botHandler = require("../api/bot.js");
  const attemptHandler = require("../api/attempt.js");
  const { getStats } = require("../api/_lib/store.js");

  // --- bot.js ---
  const res1 = mockRes();
  await botHandler({ method: "POST", body: { message: { chat: { id: 111 }, text: "/start" } } }, res1);
  console.log("bot /start ->", res1.statusCode, res1.body);
  if (res1.statusCode !== 200 || !res1.body?.ok) throw new Error("бот не ответил 200 на /start");

  const res2 = mockRes();
  await botHandler({ method: "POST", body: { message: { chat: { id: 111 }, text: "/stats" } } }, res2);
  console.log("bot /stats ->", res2.statusCode, res2.body);
  if (res2.statusCode !== 200) throw new Error("бот не ответил 200 на /stats");

  const res3 = mockRes();
  await botHandler({ method: "POST", body: { edited_message: { chat: { id: 111 }, text: "hi" } } }, res3);
  if (res3.statusCode !== 200) throw new Error("бот не ответил 200 на неизвестный тип апдейта");

  const res4 = mockRes();
  await botHandler({ method: "GET" }, res4);
  if (res4.statusCode !== 200) throw new Error("бот не ответил 200 на GET");

  // --- attempt.js + статистика ---
  const before = await getStats();
  const resA = mockRes();
  await attemptHandler({ method: "POST", body: { playerId: "web_test123" } }, resA);
  console.log("attempt ->", resA.statusCode, resA.body);
  if (resA.statusCode !== 200 || !resA.body?.ok) throw new Error("attempt не вернул ok:true");

  const after = await getStats();
  console.log("stats before/after:", before, after);
  if (after.totalAttempts !== before.totalAttempts + 1) throw new Error("totalAttempts не увеличился на 1");
  if (after.uniqueUsers < 1) throw new Error("uniqueUsers должен быть хотя бы 1");

  const resB = mockRes();
  await attemptHandler({ method: "POST", body: {} }, resB);
  if (resB.statusCode !== 400) throw new Error("attempt должен требовать playerId (400 без него)");

  // --- event.js: анонимные события (sendBeacon шлёт строку text/plain) ---
  const eventHandler = require("../api/event.js");
  const diagHandler = require("../api/diag.js");
  const resE1 = mockRes();
  await eventHandler({ method: "POST", headers: { "x-vercel-ip-country": "UZ" },
    body: JSON.stringify({ ev: "open", s: "abc", p: "tdesktop", vh: 600, user: { id: 42 }, junk: "x".repeat(50) }) }, resE1);
  if (resE1.statusCode !== 200) throw new Error("event не принял строку JSON");
  const resE2 = mockRes();
  await eventHandler({ method: "POST", headers: {}, body: { ev: "ad", r: "error", d: "Block int-1 is not active.".repeat(20) } }, resE2);
  if (resE2.statusCode !== 200) throw new Error("event не принял объект");
  const resE3 = mockRes();
  await eventHandler({ method: "POST", headers: {}, body: { ev: "hack" } }, resE3);
  if (resE3.statusCode !== 400) throw new Error("event должен отклонять неизвестные события");
  const resE4 = mockRes();
  await eventHandler({ method: "POST", headers: {}, body: "not json" }, resE4);
  if (resE4.statusCode !== 400) throw new Error("event должен отклонять мусор");
  const resE5 = mockRes();
  await eventHandler({ method: "GET", headers: {} }, resE5);
  if (resE5.statusCode !== 405) throw new Error("event должен принимать только POST");

  // --- diag.js: без ключа — 404, с ключом — события без лишних полей ---
  const resD1 = mockRes();
  await diagHandler({ method: "GET", query: { key: "0000000000000000" } }, resD1);
  if (resD1.statusCode !== 404) throw new Error("diag без верного ключа должен отвечать 404");
  const resD2 = mockRes();
  await diagHandler({ method: "GET", query: {} }, resD2);
  if (resD2.statusCode !== 404) throw new Error("diag без ключа должен отвечать 404");
  const key = require("crypto").createHash("sha256").update(process.env.TELEGRAM_BOT_TOKEN).digest("hex").slice(0, 16);
  const resD3 = mockRes();
  await diagHandler({ method: "GET", query: { key } }, resD3);
  console.log("diag ->", resD3.statusCode, JSON.stringify(resD3.body.events));
  if (resD3.statusCode !== 200 || resD3.body.events.length !== 2) throw new Error("diag должен вернуть 2 события");
  const [adEvt, openEvt] = resD3.body.events;
  if (adEvt.ev !== "ad" || openEvt.ev !== "open") throw new Error("порядок событий: новые должны быть первыми");
  if ("user" in openEvt || "junk" in openEvt) throw new Error("лишние поля (в т.ч. user) не должны сохраняться");
  if (openEvt.cc !== "UZ" || openEvt.vh !== 600) throw new Error("страна и размер окна должны сохраняться");
  if (adEvt.d.length > 160) throw new Error("длинные строки должны обрезаться");
  if (resD3.headers["Cache-Control"] !== "no-store") throw new Error("diag не должен кэшироваться");

  console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
}

main().catch((e) => { console.error("ТЕСТ ПРОВАЛЕН:", e); process.exit(1); });
