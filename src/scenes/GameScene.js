// Основной игровой цикл: спавн поручений, ловля, маршрутизация,
// настроение босса, частицы и реакция мира.
import Phaser from 'phaser';
import { W, H, PAL, HEX, DEPTS, BALANCE } from '../core/config.js';
import { buildOffice } from '../core/office.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.score = 0;
    this.lives = BALANCE.startLives;
    this.mood = BALANCE.startMood;
    this.held = [];
    this.maxHeld = BALANCE.maxHeld;
    this.tasks = [];
    this.over = false;
    this.fallBase = BALANCE.fallBase;
    this.combo = 0;

    const office = buildOffice(this);
    this.city = office.city;

    // Красный «свет ярости» поверх сцены + виньетка.
    this.rage = this.add.rectangle(W / 2, H / 2, W, H, PAL.red, 0).setDepth(40);
    this.add.image(0, 0, 'vig').setOrigin(0).setDepth(41);

    this.buildTrays();
    this.karen = this.add.image(W / 2, 150, 'karen_idle').setScale(0.6).setDepth(20);
    this.player = this.add.image(W / 2, H - 200, 'sergey_catch').setScale(0.54).setDepth(35);
    this.player.y0 = this.player.y;
    this.playerSpeed = 560;

    this.buildParticles();
    this.buildHUD();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey('A');
    this.keyD = this.input.keyboard.addKey('D');

    this.scheduleSpawn();
    this.refreshHUD();
  }

  buildTrays() {
    const slotW = W / 3;
    this.slots = [];
    DEPTS.forEach((d, i) => {
      const cx = slotW * i + slotW / 2;
      const cy = H - 58;
      const tray = this.add.container(cx, cy).setDepth(30);
      const base = this.add.graphics();
      base.fillStyle(0x000000, 0.25); base.fillRoundedRect(-slotW / 2 + 16, -26, slotW - 32, 70, 12);
      base.fillStyle(d.color, 0.95); base.fillRoundedRect(-slotW / 2 + 14, -30, slotW - 28, 70, 12);
      base.lineStyle(3, d.light, 1); base.strokeRoundedRect(-slotW / 2 + 14, -30, slotW - 28, 70, 12);
      base.fillStyle(d.light, 0.5); base.fillRoundedRect(-slotW / 2 + 14, -30, slotW - 28, 8, 12);
      tray.add(base);
      const ic = this.add.text(-slotW / 2 + 44, 4, d.ic,
        { font: 'bold 30px Segoe UI', color: HEX(PAL.ivory) }).setOrigin(0.5);
      const nm = this.add.text(8, -6, d.name,
        { font: '800 20px Segoe UI', color: HEX(PAL.ivory) }).setOrigin(0.5);
      const cap = this.add.text(8, 18, 'свободен',
        { font: '13px Segoe UI', color: HEX(PAL.ivory) }).setOrigin(0.5).setAlpha(0.8);
      tray.add([ic, nm, cap]);
      this.slots.push({ ...d, x: cx, y: cy, w: slotW - 28, tray, base, cap, load: 0, locked: false, lockT: 0 });
    });
  }

  buildParticles() {
    this.sparks = this.add.particles(0, 0, 'spark', {
      lifespan: 500, speed: { min: 60, max: 180 }, scale: { start: 0.6, end: 0 },
      blendMode: 'ADD', emitting: false, tint: [PAL.brass, PAL.ivory],
    }).setDepth(38);
    this.papers = this.add.particles(0, 0, 'paper', {
      lifespan: 900, speedX: { min: -120, max: 120 }, speedY: { min: -180, max: -40 },
      gravityY: 420, rotate: { min: 0, max: 360 }, scale: { start: 1, end: 0.7 }, emitting: false,
    }).setDepth(38);
    this.dust = this.add.particles(0, 0, 'dust', {
      lifespan: 6000, speedY: { min: -8, max: -20 }, x: { min: 0, max: W }, y: H - 150,
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.18, end: 0 }, frequency: 380, tint: PAL.brass,
    }).setDepth(15);
  }

  buildHUD() {
    this.add.rectangle(0, 0, W, 52, PAL.ink, 0.55).setOrigin(0).setDepth(45);
    this.scoreT = this.add.text(20, 12, '', { font: '800 26px Segoe UI', color: HEX(PAL.ivory) }).setDepth(46);
    this.comboT = this.add.text(20, 38, '', { font: '700 14px Segoe UI', color: HEX(PAL.teal) }).setDepth(46);
    this.livesT = this.add.text(W - 20, 14, '', { font: '900 24px Segoe UI', color: HEX(PAL.red) }).setOrigin(1, 0).setDepth(46);
    this.add.text(W / 2, 8, 'НАСТРОЕНИЕ БОССА', { font: '700 12px Segoe UI', color: HEX(PAL.brass) }).setOrigin(0.5, 0).setDepth(46);
    const mf = this.add.graphics().setDepth(46);
    mf.fillStyle(PAL.ink, 1); mf.fillRoundedRect(W / 2 - 130, 28, 260, 16, 8);
    mf.lineStyle(2, PAL.brassDk, 1); mf.strokeRoundedRect(W / 2 - 130, 28, 260, 16, 8);
    this.moodBar = this.add.rectangle(W / 2 - 126, 36, 4, 10, PAL.teal).setOrigin(0, 0.5).setDepth(46);
  }

  scheduleSpawn() {
    if (this.over) return;
    const m = this.mood / 100;
    const d = Phaser.Math.Linear(BALANCE.spawnSlow, BALANCE.spawnFast, m);
    this.time.delayedCall(d, () => { this.spawn(); this.scheduleSpawn(); });
  }

  spawn() {
    if (this.over) return;
    this.karen.setTexture(this.mood > 62 ? 'karen_angry' : 'karen_throw');
    this.tweens.add({ targets: this.karen, scaleX: 0.64, duration: 120, yoyo: true });
    this.time.delayedCall(360, () => { if (!this.over) this.karen.setTexture('karen_idle'); });

    const grey = Math.random() < BALANCE.greyChance;
    const dept = grey ? null : Phaser.Utils.Array.GetRandom(DEPTS);
    const tx = Phaser.Math.Between(80, W - 80);
    const cont = this.add.container(this.karen.x, this.karen.y + 20).setDepth(25);
    const spr = this.add.image(0, 0, grey ? 'task_grey' : 'task_' + dept.key);
    const tint = grey ? 0x9aa3b5 : dept.color;
    const lite = grey ? 0xc4ccd9 : dept.light;
    const badge = this.add.graphics();
    badge.fillStyle(0x0d1424, 0.85); badge.fillCircle(0, -34, 15);
    badge.fillStyle(tint, 1); badge.fillCircle(0, -34, 12);
    badge.lineStyle(2.5, lite, 1); badge.strokeCircle(0, -34, 14);
    const ic = this.add.text(0, -34, grey ? '?' : dept.ic, { font: 'bold 16px Segoe UI', color: '#fff' }).setOrigin(0.5);
    const arc = this.add.graphics();
    cont.add([badge, spr, ic, arc]);
    cont.setScale(0.6);
    this.tweens.add({ targets: cont, x: tx, scale: 1.05, duration: 340, ease: 'Back.out' });

    const m = this.mood / 100;
    const life = grey ? 6200 : Phaser.Math.Between(7000, 9500);
    this.tasks.push({
      cont, arc, dept, grey,
      vy: Phaser.Math.Linear(this.fallBase, BALANCE.fallMax, m) + Math.random() * 20,
      born: this.time.now, life, caught: false,
    });
  }

  catchTask(t) {
    if (this.held.length >= this.maxHeld) { this.flash('РУКИ ЗАНЯТЫ', HEX(PAL.brass)); this.bumpPlayer(); return; }
    t.caught = true;
    this.tasks = this.tasks.filter((x) => x !== t);
    this.held.push(t);
    this.player.setTexture('sergey_carry');
    this.sparks.emitParticleAt(this.player.x, this.player.y - 50, 8);
    this.bumpPlayer();
    this.layoutHeld();
  }

  bumpPlayer() { this.tweens.add({ targets: this.player, scaleY: 0.5, duration: 80, yoyo: true }); }

  layoutHeld() {
    this.held.forEach((t, i) =>
      this.tweens.add({ targets: t.cont, x: this.player.x - 36 + i * 36, y: this.player.y - 64, duration: 100 }));
    if (this.held.length === 0) this.player.setTexture('sergey_catch');
  }

  dropToSlot(slot) {
    if (this.held.length === 0) return;
    if (slot.locked) { this.flash(slot.name + ' ПЕРЕГРУЖЕН', HEX(PAL.red)); return; }
    const t = this.held.shift();
    this.tweens.add({ targets: t.cont, x: slot.x, y: slot.y - 10, scale: 0.5, alpha: 0, duration: 170, onComplete: () => t.cont.destroy() });
    const ok = t.grey || t.dept.key === slot.key;

    if (t.grey) {
      this.score += 12; this.mood = Math.max(0, this.mood - 3); this.combo++;
      this.flash('+12 ПРИСТРОИЛ', HEX(slot.light)); slot.load++; this.popSlot(slot);
    } else if (ok) {
      this.combo++;
      const b = Math.min(this.combo, 5) * 2;
      this.score += 10 + b; this.mood = Math.max(0, this.mood - 5);
      this.flash('+' + (10 + b) + (this.combo > 1 ? '  СЕРИЯ x' + this.combo : ''), HEX(slot.light));
      slot.load++;
      this.sparks.emitParticleAt(slot.x, slot.y - 20, 14);
      this.popSlot(slot);
    } else {
      this.combo = 0;
      this.score = Math.max(0, this.score - 12); this.mood = Math.min(100, this.mood + 13);
      this.flash('-12 ЧУЖОЙ ОТДЕЛ!', HEX(PAL.red));
      this.papers.emitParticleAt(slot.x, slot.y - 20, 10);
      this.cameras.main.shake(180, 0.006);
      this.popSlot(slot);
    }
    if (slot.load >= BALANCE.slotOverload && !slot.locked) {
      slot.locked = true; slot.lockT = this.time.now + BALANCE.slotLockMs;
    }
    this.layoutHeld();
    this.refreshHUD();
  }

  popSlot(slot) { this.tweens.add({ targets: slot.tray, y: slot.y - 6, duration: 90, yoyo: true }); }

  flash(msg, color) {
    const t = this.add.text(this.player.x, this.player.y - 110, msg,
      { font: '800 19px Segoe UI', color }).setOrigin(0.5).setDepth(48);
    t.setStroke('#0d1424', 5);
    this.tweens.add({ targets: t, y: t.y - 42, alpha: 0, duration: 820, ease: 'Quad.out', onComplete: () => t.destroy() });
  }

  loseLife(reason) {
    this.lives--; this.combo = 0; this.mood = Math.min(100, this.mood + 10);
    this.flash(reason, HEX(PAL.red));
    this.cameras.main.shake(220, 0.008);
    this.refreshHUD();
    if (this.lives <= 0) this.end();
  }

  refreshHUD() {
    this.scoreT.setText('ОЧКИ  ' + this.score);
    this.comboT.setText(this.combo > 1 ? 'серия x' + this.combo : '');
    this.livesT.setText('♥'.repeat(Math.max(0, this.lives)));
    this.moodBar.width = Phaser.Math.Clamp(this.mood / 100 * 252, 4, 252);
    this.moodBar.fillColor = this.mood > 66 ? PAL.red : this.mood > 40 ? PAL.brass : PAL.teal;
    this.slots.forEach((s) => s.cap.setText(s.locked ? '⏳ перегружен' : 'свободен'));
    const m = this.mood / 100;
    this.rage.setAlpha(Phaser.Math.Clamp((m - 0.5) * 0.5, 0, 0.28));
  }

  update(time, delta) {
    if (this.over) return;
    const dt = delta / 1000;
    let dir = 0;
    if (this.cursors.left.isDown || this.keyA.isDown) dir = -1;
    if (this.cursors.right.isDown || this.keyD.isDown) dir = 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + dir * this.playerSpeed * dt, 60, W - 60);
    if (dir) { this.player.setFlipX(dir < 0); this.layoutHeld(); }
    this.player.y = this.player.y0 + Math.sin(time / 300) * 3;
    if (this.city) this.city.x = (this.player.x - W / 2) * -0.04;

    for (const t of this.tasks) {
      t.cont.y += t.vy * dt;
      const left = 1 - (time - t.born) / t.life;
      t.arc.clear();
      t.arc.lineStyle(4, left > 0.4 ? 0x8fe37f : left > 0.2 ? PAL.brass : PAL.red, 1);
      t.arc.beginPath();
      t.arc.arc(0, 2, 24, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2);
      t.arc.strokePath();

      const dx = Math.abs(t.cont.x - this.player.x);
      const dy = Math.abs(t.cont.y - (this.player.y - 44));
      if (!t.caught && dx < 58 && dy < 50) this.catchTask(t);

      if (left <= 0 && !t.caught) {
        t.caught = true; this.papers.emitParticleAt(t.cont.x, t.cont.y, 6);
        t.cont.destroy(); this.tasks = this.tasks.filter((x) => x !== t);
        this.loseLife('ПРОСРОЧЕНО!');
      } else if (t.cont.y > H - 26 && !t.caught) {
        t.caught = true; this.papers.emitParticleAt(t.cont.x, t.cont.y, 6);
        t.cont.destroy(); this.tasks = this.tasks.filter((x) => x !== t);
        this.loseLife('УРОНИЛ!');
      }
    }

    this.slots.forEach((s) => {
      if (s.locked && time > s.lockT) { s.locked = false; s.load = 0; this.refreshHUD(); }
    });

    if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      const slot = this.slots.find((s) => Math.abs(s.x - this.player.x) < s.w / 2);
      if (slot) this.dropToSlot(slot);
    }
  }

  end() { this.over = true; this.scene.start('Over', { score: this.score }); }
}
