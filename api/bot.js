// Webhook Telegram-бота. Отвечает на /start кнопкой запуска мини-приложения,
// и на /stats — короткой сводкой по использованию (сколько людей, сколько попыток).
const { getStats } = require('./_lib/store');

const WEBAPP_URL = "https://pravasinov.vercel.app/";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  const update = req.body || {};
  const msg = update.message;
  if (!msg || !msg.chat || !msg.chat.id) return res.status(200).json({ ok: true });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[bot] TELEGRAM_BOT_TOKEN не задан в переменных окружения");
    return res.status(200).json({ ok: true });
  }

  const send = (payload) =>
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((e) => console.error("[bot] sendMessage не удался", e));

  const text = (msg.text || "").trim();

  try {
    if (text === "/stats") {
      const stats = await getStats();
      await send({
        chat_id: msg.chat.id,
        text:
          `📊 Статистика PravaSinov\n\n` +
          `👤 Уникальных пользователей: ${stats.uniqueUsers}\n` +
          `✅ Всего пройдено тестов: ${stats.totalAttempts}\n` +
          `📅 Сегодня: ${stats.todayAttempts}`,
      });
    } else {
      await send({
        chat_id: msg.chat.id,
        text:
          "Привет! 👋 PravaSinov — бесплатный тест ПДД с картинками для подготовки к экзамену на права. 100 вопросов, 20 за попытку, на русском и узбекском.\n\n" +
          "Salom! 👋 PravaSinov — imtihonga tayyorlanish uchun bepul, rasmli YHQ testi. 100 ta savol, har urinishda 20 tasi, rus va o'zbek tilida.\n\n" +
          "Нажми кнопку ниже, чтобы начать 👇",
        reply_markup: {
          inline_keyboard: [[{ text: "▶️ Boshlash / Начать", web_app: { url: WEBAPP_URL } }]],
        },
      });
    }
  } catch (e) {
    console.error("[bot] обработка сообщения не удалась", e);
  }

  res.status(200).json({ ok: true });
};
