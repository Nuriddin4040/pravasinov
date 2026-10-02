// Просмотр диагностики (только для владельца бота):
//   /api/diag?key=<первые 16 символов sha256 от TELEGRAM_BOT_TOKEN>[&n=200]
// Без верного ключа отвечает 404, как будто адреса нет.
const crypto = require('crypto');
const { getEvents, getStats } = require('./_lib/store');

function ownerKey() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}

module.exports = async (req, res) => {
  const want = ownerKey();
  const got = Buffer.from(String((req.query && req.query.key) || ''));
  if (!want || got.length !== want.length || !crypto.timingSafeEqual(got, Buffer.from(want))) {
    return res.status(404).json({ ok: false });
  }
  const [events, stats] = await Promise.all([getEvents(req.query && req.query.n), getStats()]);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, stats, events });
};
