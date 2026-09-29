const { recordAttempt } = require('./_lib/store');

// Вызывается фронтендом один раз, когда пользователь доходит до экрана результата —
// считаем это "пройденной попыткой" для статистики.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { playerId } = req.body || {};
  if (!playerId) return res.status(400).json({ error: 'playerId обязателен' });

  try {
    await recordAttempt(playerId);
  } catch (e) {
    // Статистика не должна ломать игру пользователю — просто логируем.
    console.error('[attempt] не удалось записать статистику', e);
  }

  res.status(200).json({ ok: true });
};
