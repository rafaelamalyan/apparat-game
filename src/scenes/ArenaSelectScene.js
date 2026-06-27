// Выбор арены перед «зарубой».
import Phaser from 'phaser';
import { W, H, PAL, HEX, ARENAS } from '../core/config.js';

export default class ArenaSelectScene extends Phaser.Scene {
  constructor() { super('ArenaSelect'); }

  create() {
    this.add.image(0, 0, 'office').setOrigin(0).setDepth(0).setDisplaySize(W, H);
    this.add.rectangle(0, 0, W, H, 0x0d0a06, 0.66).setOrigin(0).setDepth(1);
    this.add.text(W / 2, 110, 'ВЫБЕРИ АРЕНУ',
      { font: '700 52px "PT Serif"', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(10).setStroke(HEX(PAL.ink), 5);

    const cw = 470, ch = 300, gap = 60;
    const total = ARENAS.length * cw + (ARENAS.length - 1) * gap;
    let x = W / 2 - total / 2 + cw / 2;
    ARENAS.forEach((a) => { this.buildCard(a, x, H / 2 + 10, cw, ch); x += cw + gap; });

    const back = this.add.text(W / 2, H - 56, '‹  Назад',
      { font: '700 20px PT Sans', color: HEX(PAL.brass) }).setOrigin(0.5).setDepth(10).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => this.scene.start('Menu'));
    this.input.keyboard.once('keydown-ESC', () => this.scene.start('Menu'));
  }

  buildCard(a, cx, cy, cw, ch) {
    const img = this.add.image(0, 0, a.key).setDisplaySize(cw, ch);
    const frame = this.add.rectangle(0, 0, cw, ch).setStrokeStyle(4, PAL.brassDk);
    const name = this.add.text(0, ch / 2 - 28, a.name,
      { font: '800 24px "PT Serif"', color: HEX(PAL.paper), backgroundColor: 'rgba(13,10,6,0.6)', padding: { x: 16, y: 7 } }).setOrigin(0.5);
    const card = this.add.container(cx, cy, [img, frame, name]).setSize(cw, ch).setDepth(14).setInteractive({ useHandCursor: true });
    card.on('pointerover', () => { frame.setStrokeStyle(6, PAL.brass); card.setScale(1.04); });
    card.on('pointerout', () => { frame.setStrokeStyle(4, PAL.brassDk); card.setScale(1); });
    card.on('pointerdown', () => this.scene.start('Battle', { arena: a.key }));
  }
}
