// Стартовый экран: заголовок, персонажи, правила, кнопка старта.
import Phaser from 'phaser';
import { W, PAL, HEX } from '../core/config.js';
import { buildOffice } from '../core/office.js';
import { resetRun, getBestRound } from '../core/run.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    buildOffice(this);
    this.add.image(0, 0, 'vig').setOrigin(0).setDepth(50);

    const title = this.add.text(W / 2, 148, 'АППАРАТ',
      { font: '700 82px "PT Serif"', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);
    title.setStroke(HEX(PAL.ink), 4);
    title.setShadow(0, 4, 'rgba(0,0,0,0.55)', 10);

    this.add.text(W / 2, 212, 'П О Т О К   П О Р У Ч Е Н И Й',
      { font: '700 17px PT Sans', color: HEX(PAL.brass), letterSpacing: 2 }).setOrigin(0.5).setDepth(60);

    const best = getBestRound();
    if (best > 0)
      this.add.text(W / 2, 250, '🏆 Лучшая карьера: дошёл до раунда ' + best,
        { font: '700 16px PT Sans', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);

    const k = this.add.image(W / 2 - 200, 414, 'karen_throw').setScale(0.98).setDepth(60);
    const s = this.add.image(W / 2 + 200, 414, 'sergey_catch').setScale(0.94).setDepth(60);
    this.tweens.add({ targets: k, y: '-=10', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: s, y: '-=12', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 300 });
    this.add.text(W / 2 - 200, 566, 'КАРЕН Г.  ·  генеральный',
      { font: '600 15px PT Sans', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);
    this.add.text(W / 2 + 200, 566, 'СЕРЁГА  ·  Аппарат (вы)',
      { font: '600 15px PT Sans', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);

    const rules = [
      'Лови поручения Серёгой и сгружай в департамент по ЦВЕТУ папки.',
      'Раунд идёт на время. В конце — премия за работу; трать её в магазине на улучшения.',
      'Отпуск, помощница Оля и не только. Кончились жизни — карьера окончена.',
    ];
    rules.forEach((r, i) => this.add.text(W / 2, 590 + i * 26, r,
      { font: '15px PT Sans', color: '#b8c2dc' }).setOrigin(0.5).setDepth(60));

    const btn = this.add.text(W / 2, 700, 'НАЧАТЬ КАРЬЕРУ  ▶',
      { font: '800 28px PT Sans', color: HEX(PAL.ink), backgroundColor: HEX(PAL.brass), padding: { x: 32, y: 14 } })
      .setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => { btn.setScale(1.05); btn.setBackgroundColor(HEX(0xf4c46a)); });
    btn.on('pointerout', () => { btn.setScale(1); btn.setBackgroundColor(HEX(PAL.brass)); });

    const go = () => { resetRun(); this.scene.start('Game'); };
    btn.on('pointerdown', go);
    this.input.keyboard.once('keydown-SPACE', go);
    this.input.keyboard.once('keydown-ENTER', go);
  }
}
