// Конфиги бойцов — единый источник правды. Новый боец = новая запись здесь
// (+ спрайты public/sprites/fighters/<key>_<pose>.png).
// stats: maxHealth, attackPower (множитель урона), defense (множитель получаемого урона,
//        <1 = крепче), speed (px/сек ходьбы), weight (>1 = меньше отбрасывает).
// move: { pose, dmg, active(startup мс), recover(мс), reach(px), push(px),
//         fx, fxKind('fly'|'slam'), label, canBeBlocked }.
// aiProfile: 'aggressive'|'cautious'|'defensive'|'boss' (логика — фаза 2).
// uniqueMechanic: ключ механики (логика — фаза 3) или null.

export const FIGHTERS = {
  seryoga: {
    key: 'seryoga', name: 'Серёга', tag: 'Аппарат', faction: 'apparat',
    archetype: 'allrounder', nativeRight: true, playable: true,
    stats: { maxHealth: 100, attackPower: 1.0, defense: 1.0, speed: 300, weight: 1.0 },
    moves: {
      light: { pose: 'light', dmg: 7,  active: 110, recover: 240, reach: 185, push: 45,  fx: 'fx_zapiska',  fxKind: 'fly',  label: 'Служебная записка!', canBeBlocked: true },
      heavy: { pose: 'heavy', dmg: 20, active: 230, recover: 480, reach: 205, push: 110, fx: 'fx_scissors', fxKind: 'slam', label: 'Срезать премию!',    canBeBlocked: true },
    },
    aiProfile: null, uniqueMechanic: null,
  },

  sva: {
    key: 'sva', name: 'Проверка СВА', tag: 'Внутренний аудит', faction: 'audit',
    archetype: 'counter', nativeRight: false, available: true,
    stats: { maxHealth: 95, attackPower: 1.0, defense: 1.0, speed: 300, weight: 1.0 },
    moves: {
      light: { pose: 'light', dmg: 7,  active: 120, recover: 250, reach: 190, push: 45,  fx: 'fx_akt',        fxKind: 'fly',  label: 'Акт проверки!', canBeBlocked: true },
      heavy: { pose: 'heavy', dmg: 18, active: 240, recover: 490, reach: 205, push: 110, fx: 'fx_narushenie', fxKind: 'slam', label: 'Нарушение!',    canBeBlocked: true },
    },
    aiProfile: 'counter', uniqueMechanic: 'parry',
  },

  gov: {
    key: 'gov', name: 'Аппарат Правительства', tag: 'Тяжеловес сверху', faction: 'government',
    archetype: 'heavyweight', nativeRight: false, available: true,
    stats: { maxHealth: 130, attackPower: 1.25, defense: 0.8, speed: 210, weight: 1.4 },
    moves: {
      light: { pose: 'light', dmg: 10, active: 160, recover: 300, reach: 195, push: 70,  fx: null,          fxKind: 'fly',  label: 'Указание!',                canBeBlocked: true },
      heavy: { pose: 'heavy', dmg: 28, active: 320, recover: 560, reach: 215, push: 160, fx: 'fx_vygovor',  fxKind: 'slam', label: 'Под мою ответственность!', canBeBlocked: true },
    },
    aiProfile: 'boss', uniqueMechanic: 'poruchenie',
  },

  sp: {
    key: 'sp', name: 'Счётная палата', tag: 'Внешний госаудит', faction: 'audit',
    archetype: 'controller', nativeRight: false, available: true,
    stats: { maxHealth: 100, attackPower: 0.95, defense: 1.0, speed: 260, weight: 1.1 },
    moves: {
      light: { pose: 'light', dmg: 8,  active: 130, recover: 240, reach: 205, push: 40,  fx: 'fx_akt',        fxKind: 'fly',  label: 'Замечание!',   canBeBlocked: true },
      heavy: { pose: 'heavy', dmg: 20, active: 260, recover: 480, reach: 200, push: 100, fx: 'fx_narushenie', fxKind: 'slam', label: 'Том проверки!', canBeBlocked: true },
    },
    aiProfile: 'defensive', uniqueMechanic: 'violations',
  },

  prok: {
    key: 'prok', name: 'Прокуратура', tag: 'Силовое давление', faction: 'siloviki',
    archetype: 'rushdown', nativeRight: false, available: false,
    stats: { maxHealth: 90, attackPower: 0.9, defense: 1.1, speed: 360, weight: 0.9 },
    moves: {
      light: { pose: 'light', dmg: 6,  active: 90,  recover: 200, reach: 185, push: 40,  fx: null, fxKind: 'fly',  label: 'Представление!', canBeBlocked: true },
      heavy: { pose: 'heavy', dmg: 17, active: 220, recover: 460, reach: 200, push: 110, fx: null, fxKind: 'slam', label: 'Уголовное дело!',  canBeBlocked: true },
    },
    aiProfile: 'aggressive', uniqueMechanic: null,
  },
};

export const getFighter = (key) => FIGHTERS[key] || FIGHTERS.seryoga;

// Соперники (всё, что не игрок) — для экрана выбора и лестницы карьеры.
export const OPPONENTS = Object.values(FIGHTERS).filter((f) => !f.playable);
export const opponentByKey = (k) => FIGHTERS[k] && !FIGHTERS[k].playable ? FIGHTERS[k] : OPPONENTS[0];

// Соперник для дуэли карьеры — по лестнице доступных, раунды 3,6,9…
export const careerOpponent = (round) => {
  const avail = OPPONENTS.filter((o) => o.available);
  const idx = Math.max(0, Math.floor(round / 3) - 1);
  return avail[idx % avail.length];
};
