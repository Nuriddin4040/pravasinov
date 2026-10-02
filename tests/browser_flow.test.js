// Прогон мини-приложения в браузере (Playwright) так, как его видит модератор Adsgram на разных клиентах:
//  A) Telegram Desktop / мобильный клиент (мост TelegramWebviewProxy) в невысоком окне 390×560:
//     кнопка «Далее» видна без прокрутки после каждого ответа, 20 разных вопросов, реклама на 3-м вопросе,
//     окно AdsgramError не доходит до Telegram, обычные окна проходят, уходят события диагностики.
//  B) Android: мост — Java-объект, метод которого переопределить нельзя; окно Telegram открыто не на всю
//     высоту — кнопка «Далее» всё равно в видимой части, окно ошибки всё равно скрыто.
//  C) Telegram Web: приложение в iframe чужого сайта — окно ошибки не уходит родителю, обычные сообщения уходят.
//  D) Обычный браузер (вне Telegram): SDK рекламы не вызывается, никаких alert; сбой загрузки вопросов
//     показывает понятную ошибку, повторное нажатие запускает тест.
// Запуск: node tests/browser_flow.test.js  (нужен playwright и свободный порт 5980)
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5980;
const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "application/javascript", ".json": "application/json" };
const events = []; // всё, что приложение отправило в /api/event

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/attempt")) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end('{"ok":true}'); }
  if (req.url.startsWith("/api/event")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => { try { events.push(JSON.parse(body)); } catch (e) {} res.writeHead(200); res.end('{"ok":true}'); });
    return;
  }
  if (req.url.startsWith("/__parent.html")) { // «Telegram Web»: чужой сайт с приложением в iframe
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(`<!doctype html><body style="margin:0"><script>window.__fromApp=[];addEventListener("message",e=>window.__fromApp.push(e.data));</script>` +
      `<iframe id="app" src="http://localhost:${PORT}/" style="width:390px;height:620px;border:0"></iframe></body>`);
  }
  let p = req.url.split("?")[0]; if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

// Заглушка telegram-web-app.js. delta > 0 — Telegram показывает окно не на всю высоту (видно на delta px меньше).
function fakeTelegram(initData, platform, delta = 0) {
  return `(function(){
    var h = window.innerHeight - ${delta};
    ${delta ? "document.documentElement.style.setProperty('--tg-viewport-stable-height', h + 'px');" : ""}
    window.Telegram = { WebApp: {
      initData: ${JSON.stringify(initData)}, initDataUnsafe: ${initData ? "{ user: { id: 1 } }" : "{}"},
      platform: ${JSON.stringify(platform)}, version: "8.0", viewportStableHeight: h,
      ready: function(){}, expand: function(){}, isVersionAtLeast: function(){ return true; },
      setHeaderColor: function(){}, setBackgroundColor: function(){}, disableVerticalSwipes: function(){},
      openTelegramLink: function(){} } };
  })();`;
}

// Заглушка SDK Adsgram в состоянии «блок не активен». Окно ошибки отправляет тем же путём, что настоящий SDK:
// iframe → window.parent.postMessage; иначе window.external.notify; иначе TelegramWebviewProxy.postEvent;
// если мост упал — alert(текст ошибки).
const FAKE_ADSGRAM = `
window.__adShows = 0;
function __bridge(type, data) {
  try {
    if (window.self !== window.top) window.parent.postMessage(JSON.stringify({ eventType: type, eventData: data }), "*");
    else if (window.external && typeof window.external.notify === "function") window.external.notify(JSON.stringify({ eventType: type, eventData: data }));
    else window.TelegramWebviewProxy.postEvent(type, JSON.stringify(data));
  } catch (e) { alert(e.message); }
}
window.Adsgram = { init: function () { return {
  addEventListener: function () {},
  show: function () {
    window.__adShows++;
    __bridge("web_app_open_popup", { title: "AdsgramError", message: "Block int-1 is not active.", buttons: [{ type: "close" }] });
    return Promise.reject({ done: false, error: true, state: "load", description: "Block int-1 is not active." });
  } }; } };`;

const IN_TG = "query_id=AA&user=%7B%22id%22%3A1%7D&auth_date=1&hash=x";

async function routeFakes(page, initData, platform, delta = 0) {
  await page.route(/telegram-web-app\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: fakeTelegram(initData, platform, delta) }));
  await page.route(/sad\.min\.js/, (r) => r.fulfill({ contentType: "application/javascript", body: FAKE_ADSGRAM }));
}

function check(cond, msg) { if (!cond) throw new Error(msg); }

// Элемент целиком в видимой части окна (bottomLimit — нижняя граница видимой области)
async function assertVisible(target, selector, what, bottomLimit) {
  const r = await target.evaluate(({ selector, bottomLimit }) => {
    const b = document.querySelector(selector).getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, h: bottomLimit || window.innerHeight };
  }, { selector, bottomLimit });
  check(r.top >= -1 && r.bottom <= r.h + 1, `${what} не видна без прокрутки: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} окно=${r.h}`);
}

// Ответ на текущий вопрос + проверка, что объяснение и «Далее» на экране, затем переход дальше
async function answerAndNext(target, n, { useKeyboard = false, bottomLimit } = {}) {
  await target.waitForSelector("#screen-quiz:not(.hidden) #options-wrap .option:not([disabled])", { timeout: 5000 });
  const qid = await target.evaluate(() => sessionQuestions[idx].id);
  const opts = await target.$$("#options-wrap .option");
  check(opts.length === 4, `Вопрос ${qid}: ${opts.length} вариантов вместо 4`);
  const pick = Math.floor(Math.random() * 4);
  if (useKeyboard) await target.press("body", String(pick + 1));
  else await opts[pick].click();
  await target.waitForSelector("#next-wrap.show");
  await target.waitForTimeout(650); // плавная докрутка объяснения
  await assertVisible(target, "#btn-next", `Кнопка «Далее» (вопрос ${n})`, bottomLimit);
  // Объяснение целиком над панелью с кнопкой; если оно выше доступного места — видно его начало
  const ex = await target.evaluate(() => {
    const e = document.getElementById("explain-box").getBoundingClientRect();
    const bar = document.getElementById("next-wrap").getBoundingClientRect();
    return { top: e.top, bottom: e.bottom, barTop: bar.top };
  });
  const fits = ex.bottom - ex.top <= ex.barTop - 16;
  check(ex.top >= -1 && (fits ? ex.bottom <= ex.barTop + 1 : ex.top <= 24),
    `Объяснение (вопрос ${n}) закрыто кнопкой: ${Math.round(ex.top)}…${Math.round(ex.bottom)}, панель с ${Math.round(ex.barTop)}`);
  if (useKeyboard) await target.press("body", "Enter");
  else await target.click("#btn-next");
  return qid;
}

async function scenarioDesktop(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 560 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
  await page.addInitScript(() => { // мост Telegram: всё, что приложение шлёт в Telegram, складываем в __tgEvents
    window.__tgEvents = [];
    window.TelegramWebviewProxy = { postEvent(type, data) { window.__tgEvents.push([type, data]); } };
  });
  await routeFakes(page, IN_TG, "tdesktop");
  await page.goto(`http://localhost:${PORT}/`);
  await assertVisible(page, "#btn-start", "Кнопка «Начать»");
  await page.click("#btn-start");
  await page.waitForSelector("#screen-quiz:not(.hidden)");

  const seen = new Set();
  for (let i = 0; i < 20; i++) seen.add(await answerAndNext(page, i + 1, { useKeyboard: i % 4 === 1 }));
  await page.waitForSelector("#screen-result:not(.hidden)", { timeout: 5000 });
  const score = (await page.textContent("#final-score")).trim();
  const st = await page.evaluate(() => ({
    popups: window.__tgEvents.filter(([t]) => t === "web_app_open_popup").length,
    hidden: window.__adsPopupsHidden || 0, shows: window.__adShows,
  }));
  console.log(`A) Desktop 390×560: результат ${score}, вопросов ${seen.size}, вызовов рекламы ${st.shows}, окон в Telegram ${st.popups}, скрыто ${st.hidden}`);
  check(/^\d+\/20$/.test(score), "Неверный формат результата: " + score);
  check(seen.size === 20, "В сессии повторяются вопросы");
  check(st.shows === 1, `После «блок не активен» реклама должна отключаться (вызовов: ${st.shows})`);
  check(st.popups === 0 && st.hidden >= 1, "Окно AdsgramError дошло до Telegram");
  check(dialogs.length === 0, "Появился alert: " + dialogs.join("; "));
  check(errors.length === 0, "Ошибки JS на странице: " + errors.join("; "));

  const passes = await page.evaluate(() => { // обычные окна Telegram фильтр пропускает
    const before = window.__tgEvents.length;
    window.TelegramWebviewProxy.postEvent("web_app_open_popup", JSON.stringify({ title: "Info", message: "x" }));
    return window.__tgEvents.length - before;
  });
  check(passes === 1, "Фильтр заблокировал обычное окно Telegram");

  await page.waitForTimeout(300);
  const mine = events.filter((e) => e.p === "tdesktop");
  const has = (ev, f = () => true) => mine.some((e) => e.ev === ev && f(e));
  check(has("open", (e) => e.tg === 1 && e.b), "Нет события open");
  check(has("start", (e) => e.ok === 1), "Нет события start");
  check(has("q", (e) => e.i === 1), "Нет события перехода ко 2-му вопросу");
  check(has("ad", (e) => e.r === "error" && /not active/.test(e.d)), "Нет события результата рекламы");
  check(has("finish", (e) => /^\d+$/.test(String(e.sc)) && e.n === 20), "Нет события finish");
  await ctx.close();
}

async function scenarioAndroid(browser) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => { // как Java-мост Android: метод postEvent переопределить нельзя
    window.__tgEvents = [];
    const bridge = {};
    Object.defineProperty(bridge, "postEvent", { value(type, data) { window.__tgEvents.push([type, data]); }, writable: false, configurable: false, enumerable: true });
    window.TelegramWebviewProxy = bridge;
  });
  const hiddenPart = 110; // окно Telegram открыто не на всю высоту
  await routeFakes(page, IN_TG, "android", hiddenPart);
  await page.goto(`http://localhost:${PORT}/`);
  await page.click("#btn-start");
  for (let i = 0; i < 4; i++) await answerAndNext(page, i + 1, { bottomLimit: 640 - hiddenPart });
  await page.waitForSelector("#screen-quiz:not(.hidden) #options-wrap .option:not([disabled])");
  const st = await page.evaluate(() => ({
    popups: window.__tgEvents.filter(([t]) => t === "web_app_open_popup").length,
    hidden: window.__adsPopupsHidden || 0, shows: window.__adShows, at: idx,
  }));
  console.log(`B) Android 360×640 (видно ${640 - hiddenPart}px): вопрос ${st.at + 1}, вызовов рекламы ${st.shows}, окон в Telegram ${st.popups}, скрыто ${st.hidden}`);
  check(st.shows === 1 && st.popups === 0 && st.hidden >= 1, "Android: окно AdsgramError дошло до Telegram");
  check(errors.length === 0, "Ошибки JS на странице: " + errors.join("; "));
  await ctx.close();
}

async function scenarioWeb(browser) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 700 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
  await routeFakes(page, IN_TG, "weba");
  await page.goto(`http://127.0.0.1:${PORT}/__parent.html`); // родитель на другом «сайте», чем приложение
  const frame = await (await page.waitForSelector("#app")).contentFrame();
  await frame.waitForSelector("#btn-start");
  await frame.click("#btn-start");
  for (let i = 0; i < 3; i++) await answerAndNext(frame, i + 1);
  await frame.waitForSelector("#screen-quiz:not(.hidden) #options-wrap .option:not([disabled])");
  await frame.evaluate(() => window.parent.postMessage(JSON.stringify({ eventType: "web_app_open_popup", eventData: { title: "Info", message: "x" } }), "*"));
  await page.waitForTimeout(300);
  const fromApp = await page.evaluate(() => window.__fromApp);
  const st = await frame.evaluate(() => ({ hidden: window.__adsPopupsHidden || 0, shows: window.__adShows, at: idx }));
  const leaked = fromApp.filter((m) => /AdsgramError/.test(String(m)));
  console.log(`C) Telegram Web (iframe): вопрос ${st.at + 1}, вызовов рекламы ${st.shows}, сообщений родителю ${fromApp.length}, из них AdsgramError ${leaked.length}`);
  check(st.shows === 1 && st.hidden >= 1, "Telegram Web: реклама не вызывалась или окно не перехвачено");
  check(leaked.length === 0, "Telegram Web: окно AdsgramError ушло в Telegram: " + leaked.join(" | "));
  check(fromApp.some((m) => /"title":"Info"/.test(String(m))), "Telegram Web: обычное сообщение не дошло до Telegram");
  check(dialogs.length === 0, "Появился alert: " + dialogs.join("; "));
  check(errors.length === 0, "Ошибки JS на странице: " + errors.join("; "));
  await ctx.close();
}

async function scenarioBrowser(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  const dialogs = []; page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
  await routeFakes(page, "", "unknown"); // вне Telegram настоящий скрипт тоже даёт пустой initData
  let bankHits = 0; // первые два запроса вопросов (предзагрузка и первое нажатие) — сбой сети
  await page.route(/questions_bank\.json/, (r) => (++bankHits <= 2 ? r.abort() : r.continue()));
  await page.goto(`http://localhost:${PORT}/`);
  await page.click("#btn-start");
  await page.waitForSelector("#load-error:not(.hidden)", { timeout: 5000 });
  const btnText = (await page.textContent("#btn-start")).trim();
  check(btnText.includes("Начать") && !(await page.isDisabled("#btn-start")), "После сбоя кнопка «Начать» не вернулась: " + btnText);
  await page.click("#btn-start");
  await page.waitForSelector("#screen-quiz:not(.hidden)", { timeout: 5000 });
  check(await page.isHidden("#load-error"), "Сообщение об ошибке не скрылось после успешной загрузки");
  for (let i = 0; i < 3; i++) await answerAndNext(page, i + 1);
  const st = await page.evaluate(() => ({ shows: window.__adShows, at: idx, scr: currentScreen() }));
  console.log(`D) Обычный браузер: загрузок вопросов ${bankHits}, после 3-го ответа экран «${st.scr}», вопрос ${st.at + 1}, вызовов рекламы ${st.shows}`);
  check(st.shows === 0, "Вне Telegram SDK рекламы вызываться не должен");
  check(st.scr === "quiz" && st.at === 3, "Вне Telegram после 3-го вопроса должен сразу идти 4-й");
  check(dialogs.length === 0, "Появился alert: " + dialogs.join("; "));
  check(errors.length === 0, "Ошибки JS на странице: " + errors.join("; "));
  await ctx.close();
}

async function run() {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch();
  try {
    await scenarioDesktop(browser);
    await scenarioAndroid(browser);
    await scenarioWeb(browser);
    await scenarioBrowser(browser);
  } finally {
    await browser.close();
    server.close();
  }
  console.log("\nВСЕ ПРОВЕРКИ ПРОШЛИ");
}
run().catch((e) => { console.error("ТЕСТ ПРОВАЛЕН:", e.message); server.close(); process.exit(1); });
