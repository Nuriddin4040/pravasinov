// Проверка обработчиков API: не должны падать, всегда отвечают ожидаемо,
// и статистика действительно считается (через store.js, в памяти без Redis).
function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
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

  console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
}

main().catch((e) => { console.error("ТЕСТ ПРОВАЛЕН:", e); process.exit(1); });
