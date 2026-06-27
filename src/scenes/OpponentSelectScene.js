// Выбор соперника перед «зарубой».
import Phaser from 'phaser';
import { W, H, PAL, HEX } from '../core/config.js';
import { OPPONENTS } from '../core/fighters.js';

export default class OpponentSelectScene extends Phaser.Scene {
  constructor() { super('OpponentSelect'); }

  create() {
    this.add.image(0, 0, 'office').setOrigin(0).setDepth(0).setDisplaySize(W, H);
    this.add.rectangle(0, 0, W, H, 0x0d0a06, 0.7).setOrigin(0).setDepth(1);
    this.add.text(W / 2, 100, 'ВЫБЕРИ СОПЕРНИКА',
      { font: '700 50px "PT Serif"', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(10).setStroke(HEX(PAL.ink), 5);

    const cw = 232, ch = 340, gap = 26;
    const total = OPPONENTS.length * cw + (OPPONENTS.length - 1) * gap;
    let x = W / 2 - total / 2 + cw / 2;
    OPPONENTS.forEach((o) => { this.buildCard(o, x, H / 2 + 20, cw, ch); x += cw + gap; });

    const back = this.add.text(W / 2, H - 54, '‹  Назад',
      { font: '700 20px PT Sans', color: HEX(PAL.brass) }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('Menu'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
  }

  buildCard(o, cx, cy, cw, ch) {
    const parts = [];
    const bg = this.add.rectangle(0, 0, cw, ch, PAL.office2, o.available ? 0.94 : 0.55)
      .setStrokeStyle(3, o.available ? PAL.brassDk : 0x3a3a44);
    parts.push(bg);

    if (o.available) {
      const spr = this.add.image(0, -34, o.key + '_idle');
      spr.setScale((ch * 0.56) / spr.height);
      parts.push(spr);
    } else {
      parts.push(this.add.text(0, -54, '?', { font: '900 90px "PT Serif"', color: HEX(0x555562) }).setOrigin(0.5));
      parts.push(this.add.text(0, 24, 'СКОРО', { font: '800 18px PT Sans', color: HEX(0x6a6a78) }).setOrigin(0.5));
    }
    parts.push(this.add.text(0, ch / 2 - 56, o.name,
      { font: '800 19px "PT Serif"', color: HEX(o.available ? PAL.paper : 0x8a8a96), align: 'center', wordWrap: { width: cw - 24 } }).setOrigin(0.5));
    parts.push(this.add.text(0, ch / 2 - 22, o.tag,
      { font: '13px PT Sans', color: HEX(o.available ? PAL.brass : 0x6a6a78) }).setOrigin(0.5));

    const card = this.add.container(cx, cy, parts).setSize(cw, ch).setDepth(12);
    if (o.available) {
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => { bg.setStrokeStyle(5, PAL.brass); card.setScale(1.04); });
      card.on('pointerout', () => { bg.setStrokeStyle(3, PAL.brassDk); card.setScale(1); });
      card.on('pointerdown', () => this.scene.start('ArenaSelect', { opponent: o.key }));
    }
  }
}
