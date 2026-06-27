// Режим «Аппаратная дуэль» — файтинг. Каркас (вертикальный срез):
// два бойца, полоски «Позиции», ходьба, лёгкий/тяжёлый удар, блок, ИИ, KO.
// Соперник пока — зеркальный Серёга (плейсхолдер вместо «Проверки СВА»).
import Phaser from 'phaser';
import { W, H, PAL, HEX, ARENAS } from '../core/config.js';
import { SFX } from '../core/audio.js';
import { run, saveBestRound } from '../core/run.js';
import { getFighter, opponentByKey, careerOpponent } from '../core/fighters.js';
import { FIGHT, AI_PROFILES } from '../core/balance.js';

const GROUND = H - 60;
const ROUND_SECONDS = 60;   // длительность раунда до «ВРЕМЯ!»

// Кинематографичный грейд камеры по арене (контраст/насыщенность + сила свечения).
// Цель — «склеить» разношёрстные спрайты и фон в одну картинку.
const GRADE = {
  arena:  { bri: 1.0,  sat: 0.10, con: 0.10, bloom: 0.55 },   // золотой зал
  arena2: { bri: 0.99, sat: 0.16, con: 0.14, bloom: 0.60 },   // стройка-закат
};

// Боец, собранный из конфига (см. core/fighters.js).
class Fighter {
  constructor(scene, x, cfg, faceRight) {
    this.scene = scene; this.cfg = cfg;
    this.prefix = cfg.key;
    this.faceRight = faceRight;
    this.nativeRight = cfg.nativeRight !== false;
    const s = cfg.stats;
    this.maxHealth = s.maxHealth; this.hp = s.maxHealth;
    this.attackPower = s.attackPower; this.defense = s.defense;
    this.speed = s.speed; this.weight = s.weight;
    this.moves = cfg.moves;
    this.x = x; this.busy = false; this.blocking = false; this.dead = false; this.cool = 0;
    this.aiRetreat = 0; this.counterReady = false;   // состояние ИИ (фаза 2)
    this.parrying = false; this.parryTried = false;   // окно парирования (СВА)
    this.pose = 'idle';
    this.sp = scene.add.image(x, GROUND, this.prefix + '_idle').setOrigin(0.5, 1).setDepth(20);
    this.idleScale = 300 / this.sp.height;
    this.sp.setScale(this.idleScale);
    this.breathPhase = faceRight ? 0 : 1.7;        // рассинхрон дыхания бойцов
    // Контактная тень под ногами — спрайт «приземляется», перестаёт быть наклейкой.
    this.shadow = scene.add.ellipse(x, GROUND, this.sp.displayWidth * 0.6, 24, 0x000000, 0.32).setDepth(19);
    this.tint = null;
    this.applyFace();
  }
  applyFace() { this.sp.setFlipX(this.faceRight !== this.nativeRight); }
  setPose(p) { this.pose = p; this.sp.setTexture(this.prefix + '_' + p); this.applyFace(); }
  place() { this.sp.x = this.x; this.shadow.x = this.x; }
  move(dx) {
    if (this.busy || this.dead) return;
    this.x = Phaser.Math.Clamp(this.x + dx, 120, W - 120);
    this.place();
  }
}

export default class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  create(data) {
    this.career = !!(data && data.career);   // дуэль внутри карьеры (vs тест по F)
    // Арена: выбранная вручную → иначе ротация по дуэлям → иначе случайная.
    const key = (data && data.arena) ? data.arena
      : this.career ? ARENAS[(Math.floor(run.round / 3) - 1) % ARENAS.length].key
      : Phaser.Utils.Array.GetRandom(ARENAS).key;
    this.add.image(0, 0, key).setOrigin(0).setDepth(0).setDisplaySize(W, H);
    this.add.rectangle(0, 0, W, H, 0x140c04, 0.20).setOrigin(0).setDepth(1);  // лёгкий скрим
    this.add.image(0, 0, 'vig').setOrigin(0).setDepth(41);
    this.applyGrade(key);   // пост-эффекты камеры (цветокоррекция + bloom)
    this.rimColor = key === 'arena2' ? 0xffb878 : 0xffe0a8;   // тёплый контур под арену

    // Соперник: выбранный → иначе по лестнице карьеры → иначе первый доступный.
    this.opp = this.career ? careerOpponent(run.round)
      : opponentByKey(data && data.opponent);
    this.p1 = new Fighter(this, W * 0.34, getFighter('seryoga'), true);
    this.p2 = new Fighter(this, W * 0.66, this.opp, false);
    this.applyRim();   // контурный свет (rim) под цвет арены — отделяет бойцов от фона

    this.buildHUD();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey('A');
    this.keyD = this.input.keyboard.addKey('D');
    this.keyJ = this.input.keyboard.addKey('J');
    this.keyK = this.input.keyboard.addKey('K');
    this.keyS = this.input.keyboard.addKey('S');

    this.over = false;
    this.freeze = 0;     // hitstop: пауза кадра в момент удара
    this.combo = 0;
    this.lastHit = -9999;
    this.violations = 0;        // уникальная механика Счётной палаты (фаза 3)
    this.p1SlowUntil = 0;       // до какого времени игрок замедлен
    this.slowTag = null;
    this.wins1 = 0; this.wins2 = 0;   // победы в раундах (матч до 2)
    this.roundNum = 1;
    this.roundTime = ROUND_SECONDS;   // таймер раунда
    this.govBuffed = false;           // «Поручение» Аппарата Правительства (фаза 3)
    this.govBuffUntil = 0;
    this.poruchCD = FIGHT.poruch.firstMs;
    this.govAura = null; this.govTag = null;
    this.refreshViolations();
    this.announce('РАУНД 1 — ФАЙТ!', 1100);
  }

  buildHUD() {
    this.add.rectangle(0, 0, W, 70, PAL.ink, 0.5).setOrigin(0).setDepth(45);
    const bw = 460;
    const frame = (x, ox) => {
      const g = this.add.graphics().setDepth(46);
      g.lineStyle(3, PAL.brassDk, 1); g.strokeRoundedRect(x, 20, bw, 26, 6);
    };
    frame(30); frame(W - 30 - bw);
    // «chip»-полоса урона (стиль MK): отстаёт от основной и догоняет с задержкой.
    this.chip1 = this.add.rectangle(30 + 2, 23, bw - 4, 16, 0xd84a2e).setOrigin(0, 0).setDepth(45.6);
    this.chip2 = this.add.rectangle(W - 30 - 2, 23, bw - 4, 16, 0xd84a2e).setOrigin(1, 0).setDepth(45.6);
    this.hp1 = this.add.rectangle(30 + 2, 23, bw - 4, 16, PAL.teal).setOrigin(0, 0).setDepth(46);
    this.hp2 = this.add.rectangle(W - 30 - 2, 23, bw - 4, 16, PAL.teal).setOrigin(1, 0).setDepth(46);
    this.add.text(34, 50, 'СЕРЁГА', { font: '700 13px PT Sans', color: HEX(PAL.paper) }).setDepth(46);
    this.add.text(W - 34, 50, this.opp.name.toUpperCase(), { font: '700 13px PT Sans', color: HEX(PAL.paper) }).setOrigin(1, 0).setDepth(46);
    // Индикаторы побед в раундах (матч до 2): по 2 кружка над полосками здоровья
    this.winPips1 = []; this.winPips2 = [];
    for (let i = 0; i < 2; i++) {
      this.winPips1.push(this.add.circle(38 + i * 18, 10, 6, PAL.ink, 0.6).setStrokeStyle(2, PAL.brassDk).setDepth(46));
      this.winPips2.push(this.add.circle(W - 38 - i * 18, 10, 6, PAL.ink, 0.6).setStrokeStyle(2, PAL.brassDk).setDepth(46));
    }
    // Индикатор уникальной механики соперника (пока — «Нарушения» Счётной палаты)
    this.violPips = [];
    if (this.opp.uniqueMechanic === 'violations') {
      this.add.text(W - 30, 74, 'НАРУШЕНИЯ', { font: '700 12px PT Sans', color: HEX(PAL.brass) })
        .setOrigin(1, 0).setDepth(46);
      for (let i = 0; i < 3; i++) {
        const p = this.add.rectangle(W - 110 + i * 26, 76, 20, 12, PAL.ink, 0.7)
          .setStrokeStyle(2, PAL.brassDk).setOrigin(0, 0).setDepth(46);
        this.violPips.push(p);
      }
    }
    // Таймер раунда — по центру между полосками
    this.clockT = this.add.text(W / 2, 16, String(ROUND_SECONDS), { font: '800 34px "PT Serif"', color: HEX(PAL.paper) })
      .setOrigin(0.5, 0).setDepth(46).setStroke(HEX(PAL.ink), 5);
    this.bigT = this.add.text(W / 2, H * 0.32, '', { font: '700 60px "PT Serif"', color: HEX(PAL.brass) })
      .setOrigin(0.5).setDepth(60).setStroke(HEX(PAL.ink), 5);
    this.comboT = this.add.text(W / 2, 92, '', { font: '800 26px "PT Serif"', color: HEX(PAL.brass) })
      .setOrigin(0.5).setDepth(60).setStroke(HEX(PAL.ink), 4);
  }

  announce(txt, hold) {
    this.bigT.setText(txt).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: this.bigT, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
    this.time.delayedCall(hold, () => this.tweens.add({ targets: this.bigT, alpha: 0, duration: 250 }));
  }

  attack(att, def, kind) {
    if (att.busy || att.dead || this.over) return;
    const m = att.moves[kind];
    att.busy = true;
    att.setPose(m.pose);
    SFX.catch();
    this.time.delayedCall(m.active, () => {
      if (att.dead || this.over) return;
      const dx = Math.abs(att.x - def.x);
      const facingOK = att.faceRight ? def.x > att.x : def.x < att.x;
      if (dx < m.reach && facingOK && !def.dead) this.hit(att, def, m);
    });
    this.time.delayedCall(m.recover, () => { att.busy = false; if (!att.dead) att.setPose('idle'); });
  }

  hit(att, def, m) {
    // Парирование: СВА в окне идеального блока — удар игрока уходит в ноль.
    if (def.parrying && def !== this.p1) { this.doParry(att, def); return; }
    const blocked = def.blocking;
    const heavy = m.dmg >= 18;
    // ИИ-контратакёр (СВА) зарядил наказание после удачного блока
    if (blocked && def !== this.p1 && (AI_PROFILES[def.cfg.aiProfile] || {}).punish) def.counterReady = true;
    this.showMoveFx(att, def, m);
    // урон = сила бьющего × защита получающего × (блок)
    let dmg = m.dmg * att.attackPower * def.defense;
    if (blocked) dmg *= FIGHT.blockMult;
    // «Поручение»: босс под баффом бьёт сильнее и держит крепче
    if (this.govBuffed && att === this.p2) dmg *= FIGHT.poruch.atkMul;
    if (this.govBuffed && def === this.p2) dmg *= FIGHT.poruch.armorMul;
    dmg = Math.max(1, Math.round(dmg));
    def.hp = Math.max(0, def.hp - dmg);
    const dir = att.faceRight ? 1 : -1;
    const push = (blocked ? m.push * 0.4 : m.push) / def.weight;   // тяжёлых отбрасывает меньше
    const fromX = def.x;
    def.x = Phaser.Math.Clamp(def.x + dir * push, 120, W - 120);
    def.place();
    if (!blocked) { def.setPose('hit'); def.busy = true;
      this.time.delayedCall(260, () => { def.busy = false; if (!def.dead) def.setPose(def.blocking ? 'block' : 'idle'); });
    }
    if (!blocked && Math.abs(def.x - fromX) > 16) this.afterimage(def, fromX, def.x);   // шлейф отлёта
    def.sp.setTintFill(0xffffff);
    this.time.delayedCall(heavy && !blocked ? 100 : 70, () => def.sp.clearTint());
    this.freeze = blocked ? FIGHT.hitstop.blocked : (heavy ? FIGHT.hitstop.heavy : FIGHT.hitstop.light);
    // «Сок» удара: искра-звезда + цифра урона + брызги бумаг (+ вспышка кадра на тяжёлом)
    const cx = def.x + (att.faceRight ? -34 : 34), cy = GROUND - 150;
    this.hitSpark(cx, cy, heavy, blocked);
    this.damageNumber(cx, cy - 18, dmg, heavy, blocked);
    if (!blocked) this.paperBurst(cx, cy, heavy ? 9 : 5);
    if (heavy && !blocked) { this.impactFlash(); this.bloomPulse(); this.zoomPunch(); }
    this.cameras.main.shake(blocked ? FIGHT.shake.blocked : (heavy ? FIGHT.shake.heavy : FIGHT.shake.light), blocked ? 0.004 : (heavy ? 0.014 : 0.008));
    blocked ? SFX.bad() : SFX.life();
    if (def === this.p1 && !blocked) { this.combo = 0; this.comboT.setText(''); }   // игрока ударили — сброс
    if (att === this.p1 && !blocked) {
      this.combo = (this.time.now - this.lastHit < FIGHT.comboWindowMs) ? this.combo + 1 : 1;
      this.lastHit = this.time.now;
      if (this.combo >= 2) this.showCombo();
    }
    this.refreshHP();
    if (def.hp <= 0) { this.knockout(def, att); return; }
    // «Нарушения» Счётной палаты: незаблокированный удар по игроку копит счётчик
    if (att === this.p2 && !blocked && def === this.p1 && this.opp.uniqueMechanic === 'violations') {
      this.violations++;
      this.refreshViolations();
      if (this.violations >= 3) this.triggerViolations();
    }
  }

  // «Поручение»: босс входит в усиленный режим на несколько секунд (можно переждать).
  startPoruchenie(time) {
    this.govBuffed = true;
    this.govBuffUntil = time + FIGHT.poruch.durationMs;
    const g = this.p2;
    this.bigT.setColor(HEX(PAL.red));
    this.announce('ПОРУЧЕНИЕ!', 1100);
    this.callout('Под мою ответственность!', g.x, PAL.red);
    SFX.bad();
    this.cameras.main.shake(200, 0.008);
    // аура под боссом (яркий пульс) + читаемая метка
    this.govAura = this.add.ellipse(g.x, GROUND - 140, 250, 380, 0xff3b30, 0.34).setDepth(19);
    this.tweens.add({ targets: this.govAura, alpha: 0.6, scaleX: 1.12, scaleY: 1.08, duration: 520, yoyo: true, repeat: -1 });
    this.govTag = this.add.text(g.x, GROUND - 330, '⚡ ПОД ПОРУЧЕНИЕМ', { font: '900 19px PT Sans', color: HEX(PAL.paper) })
      .setOrigin(0.5).setDepth(60).setStroke(HEX(PAL.redDk), 6);
    this.tweens.add({ targets: this.govTag, alpha: 0.5, duration: 480, yoyo: true, repeat: -1 });
    this.time.delayedCall(900, () => this.bigT.setColor(HEX(PAL.brass)));
  }

  endPoruchenie() {
    this.govBuffed = false;
    this.poruchCD = FIGHT.poruch.everyMs;
    if (this.govAura) { this.tweens.killTweensOf(this.govAura); this.govAura.destroy(); this.govAura = null; }
    if (this.govTag) { this.tweens.killTweensOf(this.govTag); this.govTag.destroy(); this.govTag = null; }
  }

  // Парирование СВА: удар погашен, игрок застрял в отыгрыше, СВА бьёт в ответ.
  doParry(att, def) {
    def.parrying = false;
    const P = FIGHT.parry;
    this.callout('ПАРИРОВАНО!', att.x, PAL.red);
    // золотая вспышка на СВА
    def.sp.setTintFill(0xffe8a0);
    this.time.delayedCall(140, () => { if (!def.dead) def.sp.clearTint(); });
    const fl = this.add.rectangle(W / 2, H / 2, W, H, 0xffe8a0, 0).setDepth(58);
    this.tweens.add({ targets: fl, alpha: 0.28, duration: 70, yoyo: true, onComplete: () => fl.destroy() });
    // игрока откидывает, лёгкий стан-кадр
    const dir = att.faceRight ? -1 : 1;
    att.x = Phaser.Math.Clamp(att.x + dir * P.pushback, 120, W - 120); att.place();
    att.setPose('hit'); att.busy = true;
    this.freeze = FIGHT.hitstop.heavy;
    this.cameras.main.shake(180, 0.006);
    SFX.bad();
    // гарантированный контрудар СВА
    this.time.delayedCall(P.counterDelay, () => {
      if (!this.over && !def.dead && !att.dead) this.attack(def, att, 'heavy');
    });
  }

  refreshWins() {
    this.winPips1.forEach((p, i) => { const on = i < this.wins1; p.fillColor = on ? PAL.brass : PAL.ink; p.fillAlpha = on ? 1 : 0.6; });
    this.winPips2.forEach((p, i) => { const on = i < this.wins2; p.fillColor = on ? PAL.red : PAL.ink; p.fillAlpha = on ? 1 : 0.6; });
  }

  // Сброс на новый раунд: лечим, ставим по местам, чистим состояния.
  resetRound() {
    this.roundNum++;
    [[this.p1, W * 0.34], [this.p2, W * 0.66]].forEach(([f, x]) => {
      f.hp = f.maxHealth; f.x = x; f.dead = false; f.busy = false; f.blocking = false;
      f.cool = 0; f.aiRetreat = 0; f.counterReady = false; f.parrying = false; f.parryTried = false; f.sp.clearTint();
      f.setPose('idle'); f.place();
    });
    this.violations = 0; this.refreshViolations();
    this.p1SlowUntil = 0; if (this.slowTag) { this.slowTag.destroy(); this.slowTag = null; }
    this.combo = 0; this.comboT.setText(''); this.freeze = 0;
    if (this._smT) clearTimeout(this._smT);
    this.time.timeScale = 1; this.tweens.timeScale = 1; this.cameras.main.zoom = 1;   // снять slow-mo/зум
    if (this.govBuffed || this.govAura) this.endPoruchenie();   // снять бафф босса
    this.govBuffed = false; this.poruchCD = FIGHT.poruch.firstMs;
    this.roundTime = ROUND_SECONDS;
    this.clockT.setText(String(ROUND_SECONDS)).setColor(HEX(PAL.paper));
    this.refreshHP();
    this.over = false;
    this.bigT.setColor(HEX(PAL.brass));
    this.announce('РАУНД ' + this.roundNum + ' — ФАЙТ!', 1100);
  }

  refreshViolations() {
    this.violPips.forEach((p, i) => {
      const on = i < this.violations;
      p.fillColor = on ? PAL.red : PAL.ink;
      p.fillAlpha = on ? 1 : 0.7;
    });
  }

  // 3 нарушения → «Предписание»: штрафной урон + замедление игрока, счётчик обнуляется.
  triggerViolations() {
    this.violations = 0;
    this.refreshViolations();
    const def = this.p1;
    this.announce('ПРЕДПИСАНИЕ!', 1200);
    this.callout('Устранить нарушения!', def.x, PAL.red);
    def.hp = Math.max(0, def.hp - 12);
    def.sp.setTintFill(0xffe08a);
    this.time.delayedCall(130, () => { if (!def.dead) def.sp.clearTint(); });
    this.cameras.main.shake(220, 0.01);
    SFX.bad();
    this.p1SlowUntil = this.time.now + 4000;   // замедление на 4 сек
    if (this.slowTag) this.slowTag.destroy();
    this.slowTag = this.add.text(def.x, GROUND - 340, '⏳ ПОД ПРЕДПИСАНИЕМ',
      { font: '800 18px PT Sans', color: HEX(PAL.red) }).setOrigin(0.5).setDepth(60).setStroke(HEX(PAL.ink), 4);
    this.refreshHP();
    if (def.hp <= 0) this.knockout(def, this.p2);
  }

  showCombo() {
    this.comboT.setText('КОМБО × ' + this.combo).setScale(1.4).setAlpha(1);
    this.tweens.killTweensOf(this.comboT);
    this.tweens.add({ targets: this.comboT, scale: 1, duration: 180, ease: 'Back.out' });
  }

  // Искра-звезда в точке контакта: ядро-вспышка + лучи + расходящееся кольцо.
  hitSpark(x, y, heavy, blocked) {
    const col = blocked ? PAL.brass : (heavy ? 0xffd24a : 0xffffff);
    const n = blocked ? 5 : (heavy ? 9 : 6);
    const len = heavy ? 58 : 38;
    const core = this.add.circle(x, y, heavy ? 16 : 11, 0xffffff, 0.95).setDepth(51);
    this.tweens.add({ targets: core, scale: heavy ? 2.4 : 1.8, alpha: 0, duration: 200, ease: 'Cubic.out', onComplete: () => core.destroy() });
    for (let i = 0; i < n; i++) {
      const a = (360 * i) / n + (blocked ? 0 : Phaser.Math.Between(0, 30));
      const r = this.add.rectangle(x, y, len, heavy ? 6 : 4, col).setOrigin(0, 0.5).setDepth(51).setAngle(a);
      this.tweens.add({ targets: r, scaleX: 0.1, alpha: 0, duration: heavy ? 280 : 200, ease: 'Cubic.out', onComplete: () => r.destroy() });
    }
    if (!blocked) {
      const ring = this.add.circle(x, y, 8, 0xffffff, 0).setStrokeStyle(heavy ? 5 : 3, col).setDepth(51);
      this.tweens.add({ targets: ring, scale: heavy ? 5 : 3.4, alpha: 0, duration: 300, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    }
  }

  // Всплывающая цифра урона: красная и крупная на тяжёлом, бледная на блоке.
  damageNumber(x, y, dmg, heavy, blocked) {
    const col = blocked ? PAL.brassDk : (heavy ? PAL.red : PAL.paper);
    const size = blocked ? 20 : (heavy ? 40 : 28);
    const t = this.add.text(x + Phaser.Math.Between(-16, 16), y, String(dmg),
      { font: `900 ${size}px "PT Serif"`, color: HEX(col) }).setOrigin(0.5).setDepth(59).setStroke(HEX(PAL.ink), 5);
    t.setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 130, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - (heavy ? 90 : 64), alpha: 0, delay: 240, duration: 460, ease: 'Cubic.in', onComplete: () => t.destroy() });
  }

  // Брызги бумаг из точки удара (тематичный «мусор» вместо абстрактных частиц).
  paperBurst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, 'paper').setDepth(50).setScale(Phaser.Math.FloatBetween(0.7, 1.4));
      const ang = Phaser.Math.FloatBetween(-Math.PI, 0);          // разлёт вверх-в стороны
      const dist = Phaser.Math.Between(60, 150);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 50,                          // к концу дуги — вниз
        angle: Phaser.Math.Between(-220, 220),
        alpha: 0,
        duration: Phaser.Math.Between(420, 680),
        ease: 'Cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  // Шлейф отлёта: полупрозрачные «призраки» бойца между старой и новой позицией.
  afterimage(f, fromX, toX) {
    const ghosts = 3;
    for (let i = 1; i <= ghosts; i++) {
      const gx = fromX + (toX - fromX) * (i / (ghosts + 1));
      const g = this.add.image(gx, GROUND, f.sp.texture.key).setOrigin(0.5, 1).setDepth(18)
        .setScale(f.sp.scaleX, f.sp.scaleY).setFlipX(f.sp.flipX).setTint(0x9ec5ff).setAlpha(0.5);
      this.tweens.add({ targets: g, alpha: 0, duration: 240, onComplete: () => g.destroy() });
    }
  }

  // Короткая вспышка всего кадра (impact frame) на тяжёлом ударе.
  impactFlash() {
    const fl = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setDepth(56);
    this.tweens.add({ targets: fl, alpha: 0.16, duration: 45, yoyo: true, onComplete: () => fl.destroy() });
  }

  // Пост-эффекты камеры: цветокоррекция под арену + мягкий bloom.
  // На Canvas-рендере (нет postFX) тихо пропускаем — игра работает без эффектов.
  applyGrade(arenaKey) {
    const cam = this.cameras.main;
    this.bloom = null;
    if (!cam.postFX) return;
    const G = GRADE[arenaKey] || GRADE.arena;
    const cm = cam.postFX.addColorMatrix();
    cm.brightness(G.bri);            // базовая яркость
    cm.saturate(G.sat, true);        // живее цвета (×multiply — поверх предыдущего)
    cm.contrast(G.con, true);        // глубже контраст
    this.bloomBase = G.bloom;
    this.bloom = cam.postFX.addBloom(0xffffff, 1, 1, 1.0, G.bloom, 4);
  }

  // Контурный свет (rim): мягкое свечение по краю спрайта под цвет арены.
  // Приближение rim light без шейдера — через per-object Glow FX. Только WebGL.
  applyRim() {
    const col = this.rimColor || 0xffe0a8;
    [this.p1, this.p2].forEach((f) => {
      if (!f.sp.postFX) return;        // Canvas-фолбэк
      try { f.sp.postFX.addGlow(col, 2.0, 0, false); } catch (e) {}
    });
  }

  // Кратковременный всплеск свечения (на тяжёлом ударе/добивании).
  bloomPulse(extra = 0.85, ms = 280) {
    if (!this.bloom) return;
    this.tweens.killTweensOf(this.bloom);
    this.bloom.strength = this.bloomBase + extra;
    this.tweens.add({ targets: this.bloom, strength: this.bloomBase, duration: ms, ease: 'Quad.out' });
  }

  // Зум-панч камеры: короткий «удар» приближения на тяжёлом/нокауте.
  zoomPunch(to = 1.035, ms = 90) {
    const cam = this.cameras.main;
    this.tweens.killTweensOf(cam);
    this.tweens.add({ targets: cam, zoom: to, duration: ms, yoyo: true, ease: 'Quad.out',
      onComplete: () => { cam.zoom = 1; } });
  }

  // Slow-mo: замедляет время сцены и твины; восстановление — по реальным часам
  // (window.setTimeout не зависит от timeScale, иначе бы не вернулось).
  slowmo(scale = 0.4, ms = 700) {
    this.time.timeScale = scale;
    this.tweens.timeScale = scale;
    if (this._smT) clearTimeout(this._smT);
    this._smT = window.setTimeout(() => {
      if (this.scene && this.scene.isActive()) { this.time.timeScale = 1; this.tweens.timeScale = 1; }
    }, ms);
  }

  // Визуал именного приёма: предмет (записка/печать/ножницы) + выкрик.
  showMoveFx(att, def, m) {
    if (m.fx) {
      const fx = this.add.image(0, GROUND - 150, m.fx).setDepth(55);
      const s = 150 / fx.height;
      if (m.fxKind === 'slam') {
        fx.setPosition(def.x, GROUND - 150).setScale(s * 2.6).setAngle(-14).setAlpha(0);
        this.tweens.add({ targets: fx, scale: s, alpha: 1, duration: 110, ease: 'Back.out' });
        this.time.delayedCall(360, () => this.tweens.add({ targets: fx, alpha: 0, duration: 220, onComplete: () => fx.destroy() }));
      } else {
        fx.setPosition(att.x + (att.faceRight ? 70 : -70), GROUND - 150).setScale(s);
        this.tweens.add({ targets: fx, x: def.x, angle: att.faceRight ? 300 : -300, duration: 200,
          onComplete: () => this.tweens.add({ targets: fx, alpha: 0, scale: s * 0.6, duration: 160, onComplete: () => fx.destroy() }) });
      }
    }
    this.callout(m.label, def.x, att === this.p1 ? PAL.brass : PAL.red);
  }

  callout(txt, x, color) {
    if (!txt) return;
    const t = this.add.text(Phaser.Math.Clamp(x, 220, W - 220), GROUND - 280, txt,
      { font: '700 30px "PT Serif"', color: HEX(color) }).setOrigin(0.5).setDepth(60).setStroke(HEX(PAL.ink), 5);
    t.setScale(0.5).setAlpha(0);
    this.tweens.add({ targets: t, scale: 1, alpha: 1, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: t.y - 34, alpha: 0, delay: 520, duration: 380, onComplete: () => t.destroy() });
  }

  knockout(def, winner) {
    this.over = true;
    def.dead = true; def.setPose('ko'); def.busy = true;
    winner.setPose('win');
    this.zoomPunch(1.07, 150);     // удар приближения на решающем хите
    this.slowmo(0.4, 750);          // кинематографичная замедленка
    SFX.over();
    this.concludeRound(winner, () => this.finisherKO(def, winner));
  }

  // Время раунда вышло — победу берёт тот, у кого больше здоровья (ничья → игрок).
  timeUp() {
    this.over = true;
    const p1pct = this.p1.hp / this.p1.maxHealth, p2pct = this.p2.hp / this.p2.maxHealth;
    const winner = p1pct >= p2pct ? this.p1 : this.p2;
    winner.setPose('win'); winner.busy = true;
    SFX.over();
    this.bigT.setColor(HEX(PAL.brass));
    this.announce('ВРЕМЯ!', 900);
    this.time.delayedCall(1050, () => this.concludeRound(winner, () => {
      this.bigT.setColor(winner === this.p1 ? HEX(PAL.brass) : HEX(PAL.red));
      this.announce(winner === this.p1 ? 'ПОБЕДА ПО ОЧКАМ' : 'ПРОИГРЫШ ПО ОЧКАМ', 1500);
      this.time.delayedCall(2100, () => { this.bigT.setColor(HEX(PAL.brass)); this.endBattle(winner === this.p1); });
    }));
  }

  // Засчитать раунд: либо короткий баннер и новый раунд, либо финал матча (finisherFn).
  concludeRound(winner, finisherFn) {
    if (winner === this.p1) this.wins1++; else this.wins2++;
    this.refreshWins();
    if (this.wins1 >= 2 || this.wins2 >= 2) { finisherFn(); return; }
    this.bigT.setColor(winner === this.p1 ? HEX(PAL.brass) : HEX(PAL.red));
    this.announce(winner === this.p1 ? 'РАУНД ЗА ВАМИ!' : 'РАУНД ПРОИГРАН', 1300);
    this.time.delayedCall(1900, () => this.resetRound());
  }

  // Добивание при нокауте: затемнение + «ЗАДВИНУТЬ ЕГО!» + штамп «УВОЛЕН».
  finisherKO(def, winner) {
    const scrim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(57);
    this.tweens.add({ targets: scrim, alpha: 0.45, duration: 400 });
    this.bigT.setColor(HEX(PAL.red));
    this.announce('ЗАДВИНУТЬ ЕГО!', 1100);
    this.time.delayedCall(950, () => {
      this.cameras.main.shake(320, 0.013);
      this.bloomPulse(1.3, 420);
      const fl = this.add.rectangle(W / 2, H / 2, W, H, PAL.red, 0).setDepth(58);
      this.tweens.add({ targets: fl, alpha: 0.42, duration: 80, yoyo: true, onComplete: () => fl.destroy() });
      const stamp = this.add.text(def.x, GROUND - 170, 'УВОЛЕН\nПО СТАТЬЕ',
        { font: '900 42px "PT Serif"', color: HEX(PAL.red), align: 'center' })
        .setOrigin(0.5).setDepth(60).setStroke(HEX(PAL.redDk), 8).setAngle(-12);
      stamp.setScale(3).setAlpha(0);
      this.tweens.add({ targets: stamp, scale: 1, alpha: 1, duration: 130, ease: 'Back.out' });
    });
    this.time.delayedCall(2700, () => { this.bigT.setColor(HEX(PAL.brass)); this.endBattle(winner === this.p1); });
  }

  endBattle(playerWon) {
    if (!this.career) { this.scene.start('Menu'); return; }   // тест по F
    if (playerWon) {
      const premia = 80 + Math.round(this.p1.hp) + run.round * 8;
      run.budget += premia; run.totalEarned += premia;
      run.lastResult = { round: run.round, premia, duel: true, hp: Math.round(this.p1.hp) };
      saveBestRound(run.round);
      this.scene.start('Shop');
    } else {
      const record = saveBestRound(run.round);
      this.scene.start('Over', { round: run.round, budget: run.budget, totalEarned: run.totalEarned, record });
    }
  }

  refreshHP() {
    const w1 = (this.p1.hp / this.p1.maxHealth) * 456;
    const w2 = (this.p2.hp / this.p2.maxHealth) * 456;
    this.hp1.width = w1; this.hp2.width = w2;
    [this.hp1, this.hp2].forEach((b, i) => {
      const f = i === 0 ? this.p1 : this.p2;
      const pct = f.hp / f.maxHealth * 100;
      b.fillColor = pct > 50 ? PAL.teal : pct > 22 ? PAL.brass : PAL.red;
    });
    this.chipTo(this.chip1, w1); this.chipTo(this.chip2, w2);
  }

  // chip-полоса: при лечении — мгновенно вверх; при уроне — догоняет с задержкой.
  chipTo(chip, w) {
    this.tweens.killTweensOf(chip);
    if (w >= chip.width) { chip.width = w; return; }
    this.tweens.add({ targets: chip, width: w, delay: 260, duration: 420, ease: 'Quad.in' });
  }

  update(time, delta) {
    if (this.over) return;
    if (this.freeze > 0) { this.freeze -= delta; return; }   // hitstop
    if (this.combo > 0 && time - this.lastHit > FIGHT.comboWindowMs) { this.combo = 0; this.comboT.setText(''); }
    const dt = delta / 1000;
    const p1 = this.p1, p2 = this.p2;

    // Таймер раунда
    this.roundTime -= dt;
    const secs = Math.max(0, Math.ceil(this.roundTime));
    if (this.clockT.text !== String(secs)) {
      this.clockT.setText(String(secs));
      if (secs <= 10) this.clockT.setColor(HEX(PAL.red));
    }
    if (this.roundTime <= 0) { this.timeUp(); return; }

    // «Поручение» Аппарата Правительства: периодический бафф-окно
    if (this.p2.cfg.uniqueMechanic === 'poruchenie' && !this.p2.dead) {
      if (this.govBuffed) {
        if (this.govAura) { this.govAura.x = this.p2.x; }
        if (this.govTag) { this.govTag.x = this.p2.x; }
        if (time > this.govBuffUntil) this.endPoruchenie();
      } else {
        this.poruchCD -= delta;
        if (this.poruchCD <= 0) this.startPoruchenie(time);
      }
    }

    // Дебафф «Предписание» Счётной палаты: замедление + метка над игроком
    const slowed = this.p1SlowUntil > time;
    const pSpeed = slowed ? p1.speed * 0.5 : p1.speed;
    if (this.slowTag) {
      if (slowed) { this.slowTag.x = p1.x; }
      else { this.slowTag.destroy(); this.slowTag = null; }
    }

    // Игрок
    p1.blocking = this.keyS.isDown && !p1.busy;
    if (!p1.busy) {
      if (this.cursors.left.isDown || this.keyA.isDown) p1.move(-pSpeed * dt);
      if (this.cursors.right.isDown || this.keyD.isDown) p1.move(pSpeed * dt);
      if (!p1.blocking) {
        if (Phaser.Input.Keyboard.JustDown(this.keyJ)) this.attack(p1, p2, 'light');
        else if (Phaser.Input.Keyboard.JustDown(this.keyK)) this.attack(p1, p2, 'heavy');
        else if (p1.pose !== 'idle' && p1.pose !== 'win' && !p1.busy) p1.setPose('idle');
      } else if (p1.pose !== 'block') p1.setPose('block');
    }

    // ИИ-соперник
    this.ai(p2, p1, dt, time);
    // взгляд друг на друга
    p1.faceRight = p1.x < p2.x; p2.faceRight = p2.x < p1.x;
    p1.applyFace(); p2.applyFace();

    // Лёгкое дыхание в простое — спрайт «живой», а не вкопанный.
    const bt = time / 600;
    [p1, p2].forEach((f) => {
      if (f.dead) return;
      if (f.pose === 'idle' && !f.busy) {
        const b = Math.sin(bt + f.breathPhase) * 0.012;
        f.sp.scaleY = f.idleScale * (1 + b);
        f.sp.scaleX = f.idleScale * (1 - b * 0.4);
      } else if (f.sp.scaleY !== f.idleScale) {
        f.sp.scaleY = f.idleScale; f.sp.scaleX = f.idleScale;
      }
    });
  }

  // ИИ по архетипу: профиль берётся из cfg.aiProfile (см. AI_PROFILES).
  ai(me, foe, dt, time) {
    if (me.dead || me.busy) return;
    const P = AI_PROFILES[me.cfg.aiProfile] || AI_PROFILES.default;
    me.cool -= dt * 1000;
    const dx = Math.abs(me.x - foe.x);
    const toward = Math.sign(foe.x - me.x);
    const foeAttacking = foe.busy && dx < 235;

    // 1) Контратака: сразу наказать после удачного блока
    if (me.counterReady && dx < P.range + 25) {
      me.counterReady = false; me.blocking = false;
      this.attack(me, foe, Math.random() < P.heavy ? 'heavy' : 'light');
      me.cool = P.coolMin;
      return;
    }
    if (!foeAttacking) me.counterReady = false;   // окно наказания закрылось

    // 1.5) Парирование (СВА): один бросок шанса на каждый удар игрока
    if (me.cfg.uniqueMechanic === 'parry') {
      if (!foeAttacking) me.parryTried = false;
      if (foeAttacking && !me.parrying && !me.parryTried && dx < P.range + 20) {
        me.parryTried = true;
        if (Math.random() < FIGHT.parry.chance) {
          me.parrying = true; me.blocking = true; me.setPose('block');
          me.sp.setTint(0xfff0b0);                 // золотой намёк на идеальный блок
          me.cool = 900;
          this.time.delayedCall(FIGHT.parry.windowMs, () => { me.parrying = false; if (!me.dead) me.sp.clearTint(); });
          return;
        }
      }
    }

    // 2) Реактивный блок: вскинуть руки, когда игрок бьёт рядом
    if (foeAttacking && me.cool > 0 && Math.random() < P.reactBlock) {
      me.blocking = true; if (me.pose !== 'block') me.setPose('block');
      return;
    }

    // 3) Спейсинг: отойти после своей атаки (контролёр/контратака)
    if (me.aiRetreat > 0) {
      me.aiRetreat -= dt * 1000;
      me.blocking = false;
      me.move(-toward * me.speed * P.approach * dt);
      if (me.pose !== 'idle') me.setPose('idle');
      return;
    }

    // 4) Слишком далеко — подойти
    if (dx > P.range) {
      me.blocking = false;
      me.move(toward * me.speed * P.approach * dt);
      if (me.pose !== 'idle') me.setPose('idle');
      return;
    }

    // 5) В зоне и готов действовать
    if (me.cool <= 0) {
      if (Math.random() < P.aggression) {
        me.blocking = false;
        this.attack(me, foe, Math.random() < P.heavy ? 'heavy' : 'light');
        me.cool = P.coolMin + Math.random() * (P.coolMax - P.coolMin);
        if (P.retreat) me.aiRetreat = P.retreat;
      } else {
        // выжидание: иногда поставить блок
        me.blocking = Math.random() < P.block + 0.15;
        if (me.pose !== (me.blocking ? 'block' : 'idle')) me.setPose(me.blocking ? 'block' : 'idle');
        me.cool = 200 + Math.random() * 320;
      }
      return;
    }

    // 6) Простой: фоновый шанс блока
    me.blocking = Math.random() < P.block ? true : me.blocking;
    if (me.pose !== (me.blocking ? 'block' : 'idle')) me.setPose(me.blocking ? 'block' : 'idle');
  }
}
