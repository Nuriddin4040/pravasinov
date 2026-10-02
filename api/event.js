// Приём анонимных событий мини-приложения: открытие, старт теста, результат рекламы, ошибки.
// Никаких Telegram ID и IP не храним — только платформу клиента Telegram, версию, размер окна
// и шаг теста. Это нужно, чтобы видеть, где у людей (и у модераторов Adsgram) что-то идёт не так.
const { pushEvent } = require('./_lib/store');

const EVENTS = new Set(['open', 'start', 'q', 'ad', 'finish', 'leave', 'err']);
const FIELDS = ['ev', 's', 'b', 'p', 'v', 'ifr', 'vw', 'vh', 'tvh', 'ms', 'tg', 'sdk', 'sp', 'ct',
  'ok', 'wait', 'i', 'r', 'd', 'sc', 'n', 'm', 'scr'];

function parseBody(body) {
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (body.length > 4000) return null;
    try { return JSON.parse(body); } catch (e) { return null; }
  }
  return body && typeof body === 'object' ? body : null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const body = parseBody(req.body);
  if (!body || !EVENTS.has(body.ev)) return res.status(400).json({ ok: false });

  const evt = { at: new Date().toISOString() };
  for (const k of FIELDS) {
    const v = body[k];
    if (v === undefined || v === null || v === '') continue;
    evt[k] = typeof v === 'number' && Number.isFinite(v) ? v : String(v).slice(0, 160);
  }
  const country = req.headers && req.headers['x-vercel-ip-country'];
  if (country) evt.cc = String(country).slice(0, 4);

  try { await pushEvent(evt); } catch (e) { console.error('[event] не удалось записать', e); }
  return res.status(200).json({ ok: true });
};
