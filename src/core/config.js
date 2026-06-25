// Глобальные константы игры: размеры поля, палитра, департаменты.

// Высота поля фиксирована, ширина подстраивается под пропорции экрана
// (всегда «альбомные»), чтобы на телефоне не было чёрных полос по бокам.
export const H = 780;
export const W_DESIGN = 1100;            // эталон, под который настроен баланс

const _w = (typeof window !== 'undefined') ? window.innerWidth : W_DESIGN;
const _h = (typeof window !== 'undefined') ? window.innerHeight : H;
const _long = Math.max(_w, _h), _short = Math.min(_w, _h);
const _aspect = Math.min(Math.max(_long / _short, 1.3), 2.3);  // от 1.3:1 до 2.3:1
export const W = Math.round(H * _aspect);

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
  slotOverload: 4,      // сколько подряд в один лоток до перегрузки
  slotLockMs: 4200,     // на сколько лоток блокируется
};
