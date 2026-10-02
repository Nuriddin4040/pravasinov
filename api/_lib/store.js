// Хранилище статистики. Работает через Upstash Redis (Vercel: Storage -> Marketplace -> Upstash).
// Без подключённого Redis — падает обратно на память процесса, только для разработки:
// на реальном Vercel это не сохранится между вызовами, поэтому там Redis обязателен.
const { Redis } = require('@upstash/redis');

const memory = {
  users: new Set(),
  totalAttempts: 0,
  dailyAttempts: new Map(), // "YYYY-MM-DD" -> count
  events: [], // последние анонимные события мини-приложения (новые — в начале)
};
const EVENTS_KEY = 'ps:events';
const EVENTS_MAX = 500;
let warnedFallback = false;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-09-29"
}

// Записывает завершённую попытку теста: playerId, число правильных ответов, всего вопросов.
async function recordAttempt(playerId) {
  const redis = getRedis();
  const day = todayKey();
  if (!redis) {
    if (!warnedFallback) { console.warn('[store] Redis не настроен — использую временную память процесса (только для разработки)'); warnedFallback = true; }
    memory.users.add(playerId);
    memory.totalAttempts += 1;
    memory.dailyAttempts.set(day, (memory.dailyAttempts.get(day) || 0) + 1);
    return;
  }
  await Promise.all([
    redis.sadd('ps:users', playerId),
    redis.incr('ps:attempts_total'),
    redis.incr(`ps:attempts_day:${day}`),
  ]);
}

async function getStats() {
  const redis = getRedis();
  const day = todayKey();
  if (!redis) {
    return {
      uniqueUsers: memory.users.size,
      totalAttempts: memory.totalAttempts,
      todayAttempts: memory.dailyAttempts.get(day) || 0,
    };
  }
  const [uniqueUsers, totalAttempts, todayAttempts] = await Promise.all([
    redis.scard('ps:users'),
    redis.get('ps:attempts_total'),
    redis.get(`ps:attempts_day:${day}`),
  ]);
  return {
    uniqueUsers: uniqueUsers || 0,
    totalAttempts: Number(totalAttempts) || 0,
    todayAttempts: Number(todayAttempts) || 0,
  };
}

// Анонимное событие мини-приложения (открытие, старт, реклама, ошибки) — для диагностики.
// Храним только последние EVENTS_MAX штук.
async function pushEvent(evt) {
  const redis = getRedis();
  if (!redis) {
    memory.events.unshift(evt);
    if (memory.events.length > EVENTS_MAX) memory.events.length = EVENTS_MAX;
    return;
  }
  const p = redis.pipeline();
  p.lpush(EVENTS_KEY, JSON.stringify(evt));
  p.ltrim(EVENTS_KEY, 0, EVENTS_MAX - 1);
  await p.exec();
}

async function getEvents(limit = 200) {
  const n = Math.max(1, Math.min(EVENTS_MAX, Math.floor(Number(limit) || 200)));
  const redis = getRedis();
  if (!redis) return memory.events.slice(0, n);
  const rows = await redis.lrange(EVENTS_KEY, 0, n - 1);
  // клиент Upstash сам превращает JSON-строки обратно в объекты, но на всякий случай разбираем и строки
  return (rows || []).map((r) => {
    if (typeof r !== 'string') return r;
    try { return JSON.parse(r); } catch (e) { return { raw: r }; }
  });
}

module.exports = { recordAttempt, getStats, pushEvent, getEvents };
