// Баланс файтинга — все «магические числа» здесь, крутить без правки логики.
export const FIGHT = {
  blockMult: 0.25,          // во сколько режется урон в блок
  comboWindowMs: 1300,      // окно между ударами для комбо
  meterFull: 100,           // полный супер-метр (ульта)
  meterOnHit: 12,           // прирост метра за нанесённый удар
  meterOnTaken: 8,          // за полученный
  hitstop: { light: 80, heavy: 130, blocked: 40, ulta: 200 },   // заморозка кадра, мс
  shake:   { light: 170, heavy: 280, blocked: 90, ulta: 450 },  // длительность тряски
  ultaDamage: 50,
  // Парирование (механика СВА): окно идеального блока и контрудар.
  parry: { windowMs: 320, chance: 0.4, counterDelay: 150, pushback: 60 },
  // «Поручение» (механика Аппарата Правительства): периодический бафф.
  poruch: { firstMs: 7000, everyMs: 14000, durationMs: 4200, atkMul: 1.45, armorMul: 0.55 },
  // Эталонные множители архетипов (для справки/будущих бойцов).
  archetype: {
    allrounder:  { hp: 1.0,  atk: 1.0,  def: 1.0,  speed: 1.0,  weight: 1.0 },
    heavyweight: { hp: 1.3,  atk: 1.25, def: 0.8,  speed: 0.7,  weight: 1.4 },
    controller:  { hp: 1.0,  atk: 0.95, def: 1.0,  speed: 0.9,  weight: 1.1 },
    counter:     { hp: 0.95, atk: 1.0,  def: 1.0,  speed: 1.0,  weight: 1.0 },
    rushdown:    { hp: 0.9,  atk: 0.9,  def: 1.1,  speed: 1.25, weight: 0.9 },
    boss:        { hp: 1.5,  atk: 1.3,  def: 0.75, speed: 0.85, weight: 1.5 },
  },
  baseSpeed: 300,           // px/сек ходьбы при speed=1.0
};

// Поведение ИИ по профилю (cfg.aiProfile). Логика — в BattleScene.ai().
//   range     — дистанция, с которой готов бить (px)
//   approach  — множитель скорости подхода (от своей speed)
//   aggression— вероятность ударить, а не выжидать, когда в зоне
//   heavy     — доля тяжёлых ударов среди атак
//   block     — фоновая вероятность блока в простое
//   reactBlock— вероятность вскинуть блок, когда игрок бьёт рядом
//   retreat   — мс отхода после своей атаки (спейсинг); 0 — стоит на месте
//   coolMin/coolMax — пауза между действиями (мс)
//   punish    — контратакует сразу после удачного блока
export const AI_PROFILES = {
  default:    { range: 188, approach: 0.6,  aggression: 0.7,  heavy: 0.35, block: 0.02, reactBlock: 0.0,  retreat: 0,   coolMin: 700, coolMax: 1400, punish: false },
  // тяжеловес-босс: прёт вперёд, бьёт тяжело, почти не блокирует
  boss:       { range: 198, approach: 0.85, aggression: 0.92, heavy: 0.55, block: 0.01, reactBlock: 0.08, retreat: 0,   coolMin: 600, coolMax: 1100, punish: false },
  // рашдаун: быстрый, частые лёгкие, давит без передышки
  aggressive: { range: 182, approach: 1.0,  aggression: 0.95, heavy: 0.25, block: 0.02, reactBlock: 0.12, retreat: 0,   coolMin: 360, coolMax: 720,  punish: false },
  // контролёр: держит дистанцию, тычет, отходит, часто блокирует
  defensive:  { range: 205, approach: 0.5,  aggression: 0.55, heavy: 0.3,  block: 0.06, reactBlock: 0.35, retreat: 150, coolMin: 800, coolMax: 1500, punish: false },
  // контратака: выжидает, ставит блок, наказывает после него
  counter:    { range: 190, approach: 0.55, aggression: 0.55, heavy: 0.45, block: 0.05, reactBlock: 0.5,  retreat: 70,  coolMin: 650, coolMax: 1250, punish: true  },
};
