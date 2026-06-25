// Экран окончания смены: итоговый счёт и рестарт.
import Phaser from 'phaser';
import { W, H, PAL, HEX, getBest } from '../core/config.js';
import { buildOffice } from '../core/office.js';
import { SFX } from '../core/audio.js';

export default class OverScene extends Phaser.Scene {
  constructor() { super('Over'); }

  create(data) {
    buildOffice(this);
    this.add.image(0, 0, 'vig').setOrigin(0).setDepth(50);
    this.add.rectangle(W / 2, H / 2, W, H, PAL.ink, 0.4).setDepth(49);

    const t = this.add.text(W / 2, 220, 'СМЕНА ОКОНЧЕНА',
      { font: '900 54px Segoe UI', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);
    t.setStroke(HEX(PAL.ink), 8);

    this.add.text(W / 2, 295, 'Итог: ' + (data.score || 0) + ' очков',
      { font: '700 30px Segoe UI', color: HEX(PAL.brass) }).setOrigin(0.5).setDepth(60);

    if (data.record) {
      const r = this.add.text(W / 2, 350, '🏆 НОВЫЙ РЕКОРД!',
        { font: '900 26px Segoe UI', color: HEX(PAL.teal) }).setOrigin(0.5).setDepth(60);
      r.setStroke(HEX(PAL.ink), 6);
      this.tweens.add({ targets: r, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.time.delayedCall(250, () => SFX.record());
    } else {
      this.add.text(W / 2, 350, '🏆 Рекорд: ' + getBest(),
        { font: '600 20px Segoe UI', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60).setAlpha(0.85);
    }

    const s = this.add.image(W / 2, 470, 'sergey_idle').setScale(0.72).setDepth(60);
    this.tweens.add({ targets: s, y: '-=12', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const btn = this.add.text(W / 2, 640, 'ЕЩЁ СМЕНА  ↻',
      { font: '800 26px Segoe UI', color: HEX(PAL.ink), backgroundColor: HEX(PAL.brass), padding: { x: 30, y: 13 } })
      .setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));

    const go = () => this.scene.start('Game');
    btn.on('pointerdown', go);
    this.input.keyboard.once('keydown-SPACE', go);
    this.input.keyboard.once('keydown-ENTER', go);
  }
}
