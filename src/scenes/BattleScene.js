// Режим «Аппаратная дуэль» — файтинг. Каркас (вертикальный срез):
// два бойца, полоски «Позиции», ходьба, лёгкий/тяжёлый удар, блок, ИИ, KO.
// Соперник пока — зеркальный Серёга (плейсхолдер вместо «Проверки СВА»).
import Phaser from 'phaser';
import { W, H, PAL, HEX, ARENAS } from '../core/config.js';
import { SFX } from '../core/audio.js';
import { run, saveBestRound } from '../core/run.js';

const GROUND = H - 60;
const SERYOGA_MOVES = {
  light: { pose: 'light', dmg: 7,  reach: 185, active: 110, recover: 240, push: 45,  fx: 'fx_zapiska',  fxKind: 'fly',  label: 'Служебная записка!' },
  heavy: { pose: 'heavy', dmg: 20, reach: 205, active: 230, recover: 480, push: 110, fx: 'fx_scissors', fxKind: 'slam', label: 'Срезать премию!' },
};
const SVA_MOVES = {
  light: { pose: 'light', dmg: 7,  reach: 190, active: 120, recover: 250, push: 45,  fx: 'fx_akt',        fxKind: 'fly',  label: 'Акт проверки!' },
  heavy: { pose: 'heavy', dmg: 20, reach: 205, active: 240, recover: 490, push: 110, fx: 'fx_narushenie', fxKind: 'slam', label: 'Нарушение!' },
};

class Fighter {
  constructor(scene, x, prefix, faceRight, nativeRight, tint) {
    this.scene = scene; this.prefix = prefix; this.faceRight = faceRight;
    this.nativeRight = nativeRight !== false;   // в какую сторону смотрит сам спрайт
    this.hp = 100; this.x = x; this.busy = false; this.blocking = false; this.dead = false;
    this.cool = 0;
    this.sp = scene.add.image(x, GROUND, prefix + '_idle').setOrigin(0.5, 1).setDepth(20);
    this.scale = 300 / this.sp.height;
    this.sp.setScale(this.scale);
    if (tint) this.sp.setTint(tint);
    this.tint = tint;
    this.applyFace();
  }
  applyFace() { this.sp.setFlipX(this.faceRight !== this.nativeRight); }
  setPose(p) {
    this.sp.setTexture(this.prefix + '_' + p);
    if (this.tint) this.sp.setTint(this.tint);
    this.applyFace();
  }
  place() { this.sp.x = this.x; }
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

    this.p1 = new Fighter(this, W * 0.34, 'seryoga', true, true, null);   // Серёга смотрит вправо
    this.p2 = new Fighter(this, W * 0.66, 'sva', false, false, null);     // СВА нарисована влево
    this.p1.moves = SERYOGA_MOVES;
    this.p2.moves = SVA_MOVES;

    this.buildHUD();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey('A');
    this.keyD = this.input.keyboard.addKey('D');
    this.keyJ = this.input.keyboard.addKey('J');
    this.keyK = this.input.keyboard.addKey('K');
    this.keyS = this.input.keyboard.addKey('S');

    this.keyU = this.input.keyboard.addKey('U');

    this.over = false;
    this.freeze = 0;     // hitstop: пауза кадра в момент удара
    this.combo = 0;
    this.lastHit = -9999;
    this.meter1 = 0;     // супер-метр «Админресурс»
    this.meter2 = 0;
    this.refreshMeter();
    this.announce('ФАЙТ!', 900);
  }

  buildHUD() {
    this.add.rectangle(0, 0, W, 70, PAL.ink, 0.5).setOrigin(0).setDepth(45);
    const bw = 460;
    const frame = (x, ox) => {
      const g = this.add.graphics().setDepth(46);
      g.lineStyle(3, PAL.brassDk, 1); g.strokeRoundedRect(x, 20, bw, 26, 6);
    };
    frame(30); frame(W - 30 - bw);
    this.hp1 = this.add.rectangle(30 + 2, 23, bw - 4, 16, PAL.teal).setOrigin(0, 0).setDepth(46);
    this.hp2 = this.add.rectangle(W - 30 - 2, 23, bw - 4, 16, PAL.teal).setOrigin(1, 0).setDepth(46);
    // супер-метр «Админресурс» под здоровьем
    this.add.rectangle(30, 41, bw, 6, PAL.ink, 0.6).setOrigin(0, 0).setDepth(45);
    this.add.rectangle(W - 30, 41, bw, 6, PAL.ink, 0.6).setOrigin(1, 0).setDepth(45);
    this.mb1 = this.add.rectangle(31, 42, 1, 4, PAL.brass).setOrigin(0, 0).setDepth(46);
    this.mb2 = this.add.rectangle(W - 31, 42, 1, 4, PAL.brass).setOrigin(1, 0).setDepth(46);
    this.add.text(34, 50, 'СЕРЁГА', { font: '700 13px PT Sans', color: HEX(PAL.paper) }).setDepth(46);
    this.add.text(W - 34, 50, 'ПРОВЕРКА СВА', { font: '700 13px PT Sans', color: HEX(PAL.paper) }).setOrigin(1, 0).setDepth(46);
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
    const blocked = def.blocking;
    const heavy = m.dmg >= 18;
    this.showMoveFx(att, def, m);
    const dmg = blocked ? Math.round(m.dmg * 0.25) : m.dmg;
    def.hp = Math.max(0, def.hp - dmg);
    const dir = att.faceRight ? 1 : -1;
    def.x = Phaser.Math.Clamp(def.x + dir * (blocked ? m.push * 0.4 : m.push), 120, W - 120);
    def.place();
    if (!blocked) { def.setPose('hit'); def.busy = true;
      this.time.delayedCall(260, () => { def.busy = false; if (!def.dead) def.setPose(def.blocking ? 'block' : 'idle'); });
    }
    // вспышка попадания
    def.sp.setTintFill(0xffffff);
    this.time.delayedCall(70, () => { if (def.tint) def.sp.setTint(def.tint); else def.sp.clearTint(); });
    // hitstop — заморозка кадра для «веса» удара
    this.freeze = blocked ? 40 : (heavy ? 130 : 80);
    this.sparks(def.x, GROUND - 150, blocked);
    this.cameras.main.shake(blocked ? 90 : (heavy ? 280 : 170), blocked ? 0.004 : (heavy ? 0.014 : 0.008));
    blocked ? SFX.bad() : SFX.life();
    // комбо игрока
    if (def === this.p1 && !blocked) { this.combo = 0; this.comboT.setText(''); }   // игрока ударили — сброс
    if (att === this.p1 && !blocked) {
      this.combo = (this.time.now - this.lastHit < 1300) ? this.combo + 1 : 1;
      this.lastHit = this.time.now;
      if (this.combo >= 2) this.showCombo();
    }
    // супер-метр копится: бьющий больше, получающий меньше
    if (att === this.p1) this.meter1 = Math.min(100, this.meter1 + 12); else this.meter2 = Math.min(100, this.meter2 + 12);
    if (def === this.p1) this.meter1 = Math.min(100, this.meter1 + 8);  else this.meter2 = Math.min(100, this.meter2 + 8);
    this.refreshMeter();
    this.refreshHP();
    if (def.hp <= 0) this.knockout(def, att);
  }

  refreshMeter() {
    this.mb1.width = Math.max(1, this.meter1 / 100 * (460 - 2));
    this.mb2.width = Math.max(1, this.meter2 / 100 * (460 - 2));
    this.mb1.fillColor = this.meter1 >= 100 ? PAL.red : PAL.brass;
    this.mb2.fillColor = this.meter2 >= 100 ? PAL.red : PAL.brass;
  }

  showCombo() {
    this.comboT.setText('КОМБО × ' + this.combo).setScale(1.4).setAlpha(1);
    this.tweens.killTweensOf(this.comboT);
    this.tweens.add({ targets: this.comboT, scale: 1, duration: 180, ease: 'Back.out' });
  }

  sparks(x, y, blocked) {
    const g = this.add.circle(x, y, 6, blocked ? PAL.brass : 0xffffff).setDepth(50);
    this.tweens.add({ targets: g, scale: blocked ? 3 : 5, alpha: 0, duration: 260, onComplete: () => g.destroy() });
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

  // Ульта «На проверку ДЭБ» — врываются маски-шоу.
  doUlta(att, def) {
    if (att.busy || att.dead || this.over) return;
    att.busy = true;
    if (att === this.p1) this.meter1 = 0; else this.meter2 = 0;
    this.refreshMeter();
    att.setPose('special');
    this.bigT.setColor(HEX(PAL.red));
    this.announce('НА ПРОВЕРКУ ДЭБ!', 1400);
    const fl = this.add.rectangle(W / 2, H / 2, W, H, 0xffffff, 0).setDepth(58);
    this.tweens.add({ targets: fl, alpha: 0.6, duration: 90, yoyo: true, onComplete: () => fl.destroy() });
    this.cameras.main.shake(200, 0.006);
    const fromLeft = att.x < def.x;
    const startX = fromLeft ? -140 : W + 140;
    const debs = [1, 2, 3].map((n, i) => {
      const im = this.add.image(startX - (fromLeft ? 1 : -1) * i * 80, GROUND, 'fx_deb_' + n).setOrigin(0.5, 1).setDepth(56);
      im.setScale(330 / im.height).setFlipX(!fromLeft);
      return im;
    });
    this.time.delayedCall(140, () => debs.forEach((im, i) =>
      this.tweens.add({ targets: im, x: def.x + (fromLeft ? -1 : 1) * (40 - i * 60), duration: 380, ease: 'Quad.in' })));
    this.time.delayedCall(580, () => { if (!this.over) this.ultaHit(att, def); });
    this.time.delayedCall(1300, () => debs.forEach((im) =>
      this.tweens.add({ targets: im, alpha: 0, duration: 300, onComplete: () => im.destroy() })));
    this.time.delayedCall(1600, () => { this.bigT.setColor(HEX(PAL.brass)); att.busy = false; if (!att.dead) att.setPose('idle'); });
  }

  ultaHit(att, def) {
    def.hp = Math.max(0, def.hp - 50);
    const dir = att.faceRight ? 1 : -1;
    def.x = Phaser.Math.Clamp(def.x + dir * 70, 120, W - 120); def.place();
    def.setPose('hit'); def.busy = true;
    def.sp.setTintFill(0xffffff);
    this.time.delayedCall(110, () => { if (def.tint) def.sp.setTint(def.tint); else def.sp.clearTint(); });
    this.freeze = 200;
    this.cameras.main.shake(450, 0.022);
    SFX.over();
    this.refreshHP();
    this.time.delayedCall(800, () => { if (!def.dead) { def.busy = false; def.setPose('idle'); } });
    if (def.hp <= 0) this.knockout(def, att);
  }

  knockout(def, winner) {
    this.over = true;
    def.dead = true; def.setPose('ko'); def.busy = true;
    winner.setPose('win');
    SFX.over();
    // Добивание: затемнение + «ЗАДВИНУТЬ ЕГО!» + штамп «УВОЛЕН» слэмом.
    const scrim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0).setDepth(57);
    this.tweens.add({ targets: scrim, alpha: 0.45, duration: 400 });
    this.bigT.setColor(HEX(PAL.red));
    this.announce('ЗАДВИНУТЬ ЕГО!', 1100);
    this.time.delayedCall(950, () => {
      this.cameras.main.shake(320, 0.013);
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
    this.hp1.width = (this.p1.hp / 100) * 456;
    this.hp2.width = (this.p2.hp / 100) * 456;
    [this.hp1, this.hp2].forEach((b, i) => {
      const hp = i === 0 ? this.p1.hp : this.p2.hp;
      b.fillColor = hp > 50 ? PAL.teal : hp > 22 ? PAL.brass : PAL.red;
    });
  }

  update(time, delta) {
    if (this.over) return;
    if (this.freeze > 0) { this.freeze -= delta; return; }   // hitstop
    if (this.combo > 0 && time - this.lastHit > 1300) { this.combo = 0; this.comboT.setText(''); }
    const dt = delta / 1000;
    const p1 = this.p1, p2 = this.p2;

    // Игрок
    p1.blocking = this.keyS.isDown && !p1.busy;
    if (!p1.busy) {
      if (this.cursors.left.isDown || this.keyA.isDown) p1.move(-300 * dt);
      if (this.cursors.right.isDown || this.keyD.isDown) p1.move(300 * dt);
      if (!p1.blocking) {
        if (this.meter1 >= 100 && Phaser.Input.Keyboard.JustDown(this.keyU)) this.doUlta(p1, p2);
        else if (Phaser.Input.Keyboard.JustDown(this.keyJ)) this.attack(p1, p2, 'light');
        else if (Phaser.Input.Keyboard.JustDown(this.keyK)) this.attack(p1, p2, 'heavy');
        else if (p1.pose !== 'idle' && p1.pose !== 'win' && !p1.busy) p1.setPose('idle');
      } else if (p1.pose !== 'block') p1.setPose('block');
    }

    // ИИ-соперник
    this.ai(p2, p1, dt, time);
    // взгляд друг на друга
    p1.faceRight = p1.x < p2.x; p2.faceRight = p2.x < p1.x;
    p1.applyFace(); p2.applyFace();
  }

  ai(me, foe, dt, time) {
    if (me.dead || me.busy) return;
    me.cool -= dt * 1000;
    const dx = Math.abs(me.x - foe.x);
    if (dx > 190) {
      me.blocking = false;
      me.move(Math.sign(foe.x - me.x) * 170 * dt);
      if (me.pose !== 'idle') me.setPose('idle');
    } else if (me.cool <= 0) {
      me.blocking = false;
      if (this.meter2 >= 100) { this.doUlta(me, foe); me.cool = 1600; }
      else {
        const kind = Math.random() < 0.35 ? 'heavy' : 'light';
        this.attack(me, foe, kind);
        me.cool = 700 + Math.random() * 700;
      }
    } else {
      // иногда блок
      me.blocking = Math.random() < 0.02 ? true : me.blocking;
      me.setPose(me.blocking ? 'block' : 'idle');
    }
  }
}
