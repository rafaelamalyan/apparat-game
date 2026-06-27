// Состояние карьеры: раунды, бюджет, купленные улучшения.
// Живёт на время сессии; сбрасывается при старте новой карьеры.
import { BALANCE } from './config.js';

export const run = {
  round: 1,
  budget: 0,                 // ₽ на покупки в магазине
  totalEarned: 0,            // всего заработано за карьеру
  upgrades: { speed: 0, hands: 0, lives: 0, mult: 0, calm: 0, olya: 0 },
  lastResult: null,          // итоги последнего раунда (для экрана магазина)
};

export function resetRun() {
  run.round = 1;
  run.budget = 0;
  run.totalEarned = 0;
  run.upgrades = { speed: 0, hands: 0, lives: 0, mult: 0, calm: 0, olya: 0 };
  run.lastResult = null;
}

// Эффективные характеристики с учётом улучшений.
export function effStats() {
  const u = run.upgrades;
  return {
    lives:   BALANCE.startLives + u.lives,
    maxHeld: BALANCE.maxHeld + u.hands,
    speed:   560 + u.speed * 90,
    mult:    1 + u.mult * 0.25,
    spawnMul: 1 + u.calm * 0.15,      // >1 — спавн реже (спокойнее)
    moodMul:  1 - u.calm * 0.18,      // медленнее растёт ярость
    olya:    u.olya,                  // уровень помощницы (0 — нет)
  };
}

// Каталог магазина. cost растёт с уровнем: base + level*step.
export const SHOP = [
  { key: 'speed', icon: '🏖️', name: 'Путёвка в санаторий', desc: 'Серёга отдохнул — двигается быстрее', base: 70,  step: 55, max: 5 },
  { key: 'olya',  icon: '👩', name: 'Помощница Оля',         desc: 'Сама ловит и сортирует поручения',  base: 150, step: 120, max: 3 },
  { key: 'hands', icon: '💼', name: 'Большой портфель',      desc: '+1 поручение в руках',              base: 90,  step: 70, max: 4 },
  { key: 'lives', icon: '🤝', name: 'Связи наверху',         desc: '+1 жизнь на каждый раунд',          base: 100, step: 80, max: 5 },
  { key: 'mult',  icon: '📈', name: 'Премиальный коэффициент', desc: '+25% ко всем очкам',              base: 120, step: 95, max: 4 },
  { key: 'calm',  icon: '☕', name: 'Кофемашина в приёмной',  desc: 'Босс спокойнее, темп ниже',         base: 80,  step: 60, max: 3 },
];

export const costOf = (item) => item.base + run.upgrades[item.key] * item.step;
export const isMaxed = (item) => run.upgrades[item.key] >= item.max;

// Длительность и сложность раунда.
export const roundDuration = (r) => Math.min(30 + (r - 1) * 15, 90);   // сек
export const roundDiff = (r) => 1 + (r - 1) * 0.12;                     // множитель скорости падения

// Раунды 3, 6, 9… — дуэль (файтинг) вместо ловли.
export const isDuelRound = (r) => r % 3 === 0;
// Запуск нужной сцены под текущий раунд карьеры.
export function startRound(scene) {
  scene.scene.start(isDuelRound(run.round) ? 'Battle' : 'Game', { career: true });
}

// Рекорд карьеры — самый далёкий раунд.
export const getBestRound = () => +localStorage.getItem('apparat_best_round') || 0;
export const saveBestRound = (r) => {
  if (r > getBestRound()) { localStorage.setItem('apparat_best_round', String(r)); return true; }
  return false;
};
