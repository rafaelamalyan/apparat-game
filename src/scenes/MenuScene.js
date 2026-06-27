// Стартовый экран: заголовок, персонажи, правила, кнопка старта.
import Phaser from 'phaser';
import { W, PAL, HEX } from '../core/config.js';
import { buildOffice } from '../core/office.js';
import { resetRun, getBestRound, startRound } from '../core/run.js';

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

    const k = this.add.image(W / 2 - 210, 416, 'karen_throw').setScale(1.15).setDepth(60);
    const s = this.add.image(W / 2 + 210, 416, 'sergey_catch').setScale(1.10).setDepth(60);
    this.tweens.add({ targets: k, y: '-=10', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: s, y: '-=12', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 300 });
    this.add.text(W / 2 - 210, 598, 'ШЕФ  ·  генеральный',
      { font: '700 15px PT Sans', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);
    this.add.text(W / 2 + 210, 598, 'СЕРЁГА  ·  Аппарат (вы)',
      { font: '700 15px PT Sans', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60);

    const rules = [
      'Лови поручения Серёгой и сгружай в департамент по ЦВЕТУ папки.',
      'Раунд идёт на время. В конце — премия за работу; трать её в магазине на улучшения.',
      'Отпуск, помощница Оля и не только. Кончились жизни — карьера окончена.',
    ];
    rules.forEach((r, i) => this.add.text(W / 2, 624 + i * 23, r,
      { font: '15px PT Sans', color: '#cdd6e6' }).setOrigin(0.5).setDepth(60));

    const makeBtn = (x, label, bg, hover, txt, onClick) => {
      const b = this.add.text(x, 722, label,
        { font: '800 23px PT Sans', color: HEX(txt), backgroundColor: HEX(bg), padding: { x: 24, y: 13 } })
        .setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
      b.on('pointerover', () => { b.setScale(1.05); b.setBackgroundColor(HEX(hover)); });
      b.on('pointerout', () => { b.setScale(1); b.setBackgroundColor(HEX(bg)); });
      b.on('pointerdown', onClick);
      return b;
    };
    const career = () => { resetRun(); startRound(this); };
    const fight = () => this.scene.start('OpponentSelect');   // соперник → арена → бой
    makeBtn(W / 2 - 178, 'НАЧАТЬ КАРЬЕРУ  ▶', PAL.brass, 0xf4c46a, PAL.ink, career);
    makeBtn(W / 2 + 200, 'В ЗАРУБУ  🥊', PAL.red, 0xd8485f, PAL.paper, fight);
    this.input.keyboard.once('keydown-SPACE', career);
    this.input.keyboard.once('keydown-ENTER', career);
    this.input.keyboard.once('keydown-F', fight);
  }
}
