// Экран конца карьеры: до какого раунда дошёл, заработок, рекорд.
import Phaser from 'phaser';
import { W, H, PAL, HEX } from '../core/config.js';
import { buildOffice } from '../core/office.js';
import { SFX } from '../core/audio.js';
import { resetRun, getBestRound } from '../core/run.js';

export default class OverScene extends Phaser.Scene {
  constructor() { super('Over'); }

  create(data) {
    const round = data.round || 1;
    const total = data.totalEarned || 0;

    buildOffice(this);
    this.add.image(0, 0, 'vig').setOrigin(0).setDepth(50);
    this.add.rectangle(W / 2, H / 2, W, H, PAL.ink, 0.45).setDepth(49);

    const t = this.add.text(W / 2, 200, 'КАРЬЕРА ОКОНЧЕНА',
      { font: '900 54px Segoe UI', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);
    t.setStroke(HEX(PAL.ink), 8);

    this.add.text(W / 2, 280, 'Дошёл до раунда ' + round,
      { font: '700 32px Segoe UI', color: HEX(PAL.brass) }).setOrigin(0.5).setDepth(60);
    this.add.text(W / 2, 322, 'Заработано за карьеру: ' + total + ' ₽',
      { font: '600 20px Segoe UI', color: '#b8c2dc' }).setOrigin(0.5).setDepth(60);

    if (data.record) {
      const r = this.add.text(W / 2, 366, '🏆 НОВЫЙ РЕКОРД КАРЬЕРЫ!',
        { font: '900 24px Segoe UI', color: HEX(PAL.teal) }).setOrigin(0.5).setDepth(60);
      r.setStroke(HEX(PAL.ink), 6);
      this.tweens.add({ targets: r, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.time.delayedCall(250, () => SFX.record());
    } else {
      this.add.text(W / 2, 366, '🏆 Рекорд: раунд ' + getBestRound(),
        { font: '600 18px Segoe UI', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60).setAlpha(0.85);
    }

    const s = this.add.image(W / 2, 500, 'sergey_idle').setScale(0.66).setDepth(60);
    this.tweens.add({ targets: s, y: '-=12', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const btn = this.add.text(W / 2, 650, 'НОВАЯ КАРЬЕРА  ↻',
      { font: '800 26px Segoe UI', color: HEX(PAL.ink), backgroundColor: HEX(PAL.brass), padding: { x: 30, y: 13 } })
      .setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));

    const go = () => { resetRun(); this.scene.start('Game'); };
    btn.on('pointerdown', go);
    this.input.keyboard.once('keydown-SPACE', go);
    this.input.keyboard.once('keydown-ENTER', go);
  }
}
