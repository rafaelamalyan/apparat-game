// Глобальные константы игры: размеры поля, палитра, департаменты.

export const W = 1100;
export const H = 780;

// Палитра: тёплая корпоративная сатира.
export const PAL = {
  ink: 0x0d1424,
  office: 0x1a2440,
  office2: 0x223056,
  brass: 0xe8b04a,
  brassDk: 0xb07c1e,
  paper: 0xf4ead2,
  red: 0xc8324a,
  redDk: 0x8e1f33,
  teal: 0x36b3a8,
  ivory: 0xf4ead2,
  glass: 0x2a3a64,
};

export const HEX = (c) => '#' + c.toString(16).padStart(6, '0');

// Три департамента + цвета для папок и лотков.
export const DEPTS = [
  { key: 'proj',  name: 'ПРОЕКТ',   color: 0x3a78c8, dark: 0x255092, light: 0x8fc4f4, ic: '△' },
  { key: 'build', name: 'СТРОЙКА',  color: 0xe09030, dark: 0xb06c18, light: 0xf6c878, ic: '⬚' },
  { key: 'fin',   name: 'ФИНАНСЫ',  color: 0x33a877, dark: 0x1f7a52, light: 0x82e0b0, ic: '₽' },
];

// Баланс игры — крутить здесь.
export const BALANCE = {
  startLives: 5,
  startMood: 20,        // 0 спокоен … 100 в ярости
  maxHeld: 4,           // сколько поручений Серёга держит в руках
  fallBase: 80,         // базовая скорость падения (px/сек)
  fallMax: 180,         // при максимальной ярости
  spawnSlow: 1750,      // интервал спавна при спокойном боссе (мс)
  spawnFast: 720,       // при ярости
  greyChance: 0.18,     // доля «непонятно чьих» поручений
  slotOverload: 8,      // порог перегрузки одного лотка (счётчик спадает со временем)
  slotLockMs: 2200,     // на сколько лоток блокируется
  loadDecay: 1.6,       // на сколько счётчик лотка спадает в секунду
  quarterEvery: 150,    // каждые столько очков — бонус-волна «конец квартала»
  bonusMs: 8000,        // длительность волны
  bonusSpawnMs: 640,    // интервал спавна во время волны (аврал)
};

// Реплики Карена при броске — аппаратная сатира.
export const KAREN_LINES = [
  'Это срочно!', 'Вчера ещё надо было.', 'Под мою ответственность.',
  'Согласовано.', 'На контроль!', 'Кто, если не ты?', 'Освой бюджет.',
  'Доложить к вечеру.', 'Без бумажки никуда.', 'Берёшь и делаешь.',
  'Аппарат не спит.', 'Это не обсуждается.',
];
export const KAREN_LINES_ANGRY = [
  'Я сказал — бегом!', 'Опять провал?!', 'Где дисциплина?!',
  'Уволю к чёрту!', 'Шевелись!', 'Это саботаж!',
];

// Арены для файтинга (ключ текстуры + название). Добавлять сюда новые.
export const ARENAS = [
  { key: 'arena',  name: 'Коридор власти' },
  { key: 'arena2', name: 'Стройплощадка' },
];

// Соперники-файтеры. key = префикс спрайтов (key_idle/_light/…). nativeRight —
// в какую сторону смотрит арт. available — есть ли спрайты (иначе «скоро»).
export const OPPONENTS = [
  { key: 'sva',  name: 'Проверка СВА',         tag: 'Внутренний аудит',    nativeRight: false, available: true },
  { key: 'gov',  name: 'Аппарат Правительства', tag: 'Тяжеловес сверху',   nativeRight: false, available: false },
  { key: 'sp',   name: 'Счётная палата',        tag: 'Внешний госаудит',    nativeRight: false, available: false },
  { key: 'prok', name: 'Прокуратура',           tag: 'Силовое давление',    nativeRight: false, available: false },
];
export const opponentByKey = (k) => OPPONENTS.find((o) => o.key === k) || OPPONENTS[0];
