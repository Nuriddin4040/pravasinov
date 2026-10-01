// Полный прогон теста в браузере (Playwright): 20 вопросов, реклама каждый 3-й вопрос,
// и проверка, что при неактивном блоке Adsgram техническое окно «AdsgramError» не показывается,
// а тест спокойно доходит до результата.
// Запуск: node tests/browser_flow.test.js  (нужен playwright и свободный порт 5980)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "application/javascript", ".json": "application/json" };

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/attempt")) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end('{"ok":true}'); }
  let p = req.url.split("?")[0]; if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

// Заглушка SDK Adsgram, которая ведёт себя как неактивный блок: шлёт окно ошибки в Telegram и отклоняет show()
const FAKE_ADSGRAM = `
window.__adShows = 0;
window.Adsgram = { init() { return {
  addEventListener() {},
  show() {
    window.__adShows++;
    window.TelegramWebviewProxy.postEvent("web_app_open_popup", JSON.stringify({ title: "AdsgramError", message: "Block int-1 is not active." }));
    return Promise.reject({ done: false, error: true, description: "Block int-1 is not active." });
  } }; } };`;

async function run() {
  await new Promise((r) => server.listen(5980, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Имитация клиента Telegram: всё, что приложение отправляет в Telegram, складываем в __tgEvents
  await page.addInitScript(() => {
    window.__tgEvents = [];
    window.TelegramWebviewProxy = { postEvent(type, data) { window.__tgEvents.push([type, data]); } };
  });
  await page.route(/telegram-web-app\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route(/sad\.min\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: FAKE_ADSGRAM }));

  await page.goto("http://localhost:5980/");
  await page.click("#btn-start");
  await page.waitForSelector("#screen-quiz:not(.hidden)");

  const seenIds = new Set();
  for (let i = 0; i < 20; i++) {
    await page.waitForSelector("#screen-quiz:not(.hidden) #options-wrap .option", { timeout: 5000 });
    const qid = await page.evaluate(() => sessionQuestions[idx].id);
    seenIds.add(qid);
    const opts = await page.$$("#options-wrap .option");
    if (opts.length !== 4) throw new Error(`Вопрос ${qid}: ${opts.length} вариантов вместо 4`);
    await opts[Math.floor(Math.random() * 4)].click();
    await page.waitForSelector("#next-wrap.show");
    await page.click("#btn-next");
  }
  await page.waitForSelector("#screen-result:not(.hidden)", { timeout: 5000 });
  const score = (await page.textContent("#final-score")).trim();
  const popups = await page.evaluate(() => window.__tgEvents.filter(([t]) => t === "web_app_open_popup"));
  const shows = await page.evaluate(() => window.__adShows);

  console.log("результат:", score, "| уникальных вопросов:", seenIds.size, "| вызовов рекламы:", shows, "| окон в Telegram:", popups.length);
  if (!/^\d+\/20$/.test(score)) throw new Error("Неверный формат результата: " + score);
  if (seenIds.size !== 20) throw new Error("В сессии повторяются вопросы");
  if (popups.length !== 0) throw new Error("Окно AdsgramError дошло до Telegram: " + JSON.stringify(popups));
  if (shows !== 1) throw new Error(`После «блок не активен» реклама должна отключаться (вызовов: ${shows})`);
  if (errors.length) throw new Error("Ошибки JS на странице: " + errors.join("; "));

  // Обычные окна Telegram (не от Adsgram) фильтр пропускать не должен
  const passes = await page.evaluate(() => {
    window.TelegramWebviewProxy.postEvent("web_app_open_popup", JSON.stringify({ title: "Info", message: "x" }));
    return window.__tgEvents.length;
  });
  if (passes < 1) throw new Error("Фильтр заблокировал обычное окно Telegram");

  await browser.close(); server.close();
  console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
}
run().catch((e) => { console.error("ТЕСТ ПРОВАЛЕН:", e.message); server.close(); process.exit(1); });
