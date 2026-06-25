// Экран между раундами: премия за раунд + магазин улучшений.
import Phaser from 'phaser';
import { W, H, PAL, HEX } from '../core/config.js';
import { buildOffice } from '../core/office.js';
import { run, SHOP, costOf, isMaxed } from '../core/run.js';
import { SFX } from '../core/audio.js';

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    buildOffice(this);
    this.add.image(0, 0, 'vig').setOrigin(0).setDepth(50);
    this.add.rectangle(W / 2, H / 2, W, H, PAL.ink, 0.55).setDepth(49);

    const r = run.lastResult || { round: run.round, score: 0, livesBonus: 0, noLossBonus: 0, premia: 0, noLoss: false };

    // Заголовок + разбивка премии.
    this.add.text(W / 2, 40, 'РАУНД ' + r.round + ' СДАН',
      { font: '900 40px Segoe UI', color: HEX(PAL.paper) }).setOrigin(0.5).setDepth(60).setStroke(HEX(PAL.ink), 7);

    const lines = [
      'Очки за раунд:  ' + r.score,
      'Бонус за жизни:  +' + r.livesBonus,
      ...(r.noLossBonus ? ['Без потерь:  +' + r.noLossBonus] : []),
    ];
    this.add.text(W / 2, 92, lines.join('     '),
      { font: '600 17px Segoe UI', color: '#b8c2dc' }).setOrigin(0.5).setDepth(60);
    this.add.text(W / 2, 124, '💰 ПРЕМИЯ:  +' + r.premia + ' ₽',
      { font: '900 26px Segoe UI', color: HEX(PAL.brass) }).setOrigin(0.5).setDepth(60);

    this.budgetT = this.add.text(W / 2, 168, '', { font: '800 24px Segoe UI', color: HEX(PAL.teal) })
      .setOrigin(0.5).setDepth(60);
    this.refreshBudget();

    this.add.text(W / 2, 206, 'М А Г А З И Н   У Л У Ч Ш Е Н И Й',
      { font: '700 15px Segoe UI', color: HEX(PAL.brass) }).setOrigin(0.5).setDepth(60);

    // Карточки магазина — 2 столбца × 3 ряда.
    const cardW = 470, cardH = 116, gx = 250, gy = 296, dx = W - 500, dy = 132;
    this.cards = [];
    SHOP.forEach((item, i) => {
      const col = i % 2, row = (i / 2) | 0;
      this.cards.push(this.buildCard(item, gx + col * dx, gy + row * dy, cardW, cardH));
    });

    // Кнопка «следующий раунд».
    const btn = this.add.text(W / 2, H - 46, 'СЛЕДУЮЩИЙ РАУНД  ▶',
      { font: '800 26px Segoe UI', color: HEX(PAL.ink), backgroundColor: HEX(PAL.brass), padding: { x: 30, y: 13 } })
      .setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    const go = () => { run.round += 1; this.scene.start('Game'); };
    btn.on('pointerdown', go);
    this.input.keyboard.once('keydown-ENTER', go);
    this.input.keyboard.once('keydown-SPACE', go);
  }

  refreshBudget() { this.budgetT.setText('Бюджет:  ' + run.budget + ' ₽'); }

  buildCard(item, cx, cy, cw, ch) {
    const lvl = () => run.upgrades[item.key];
    const bg = this.add.rectangle(0, 0, cw, ch, PAL.office2, 0.92).setStrokeStyle(2, PAL.brassDk);
    const icon = this.add.text(-cw / 2 + 38, 0, item.icon, { font: '40px Segoe UI' }).setOrigin(0.5);
    const name = this.add.text(-cw / 2 + 72, -30, item.name, { font: '800 20px Segoe UI', color: HEX(PAL.paper) }).setOrigin(0, 0.5);
    const desc = this.add.text(-cw / 2 + 72, -4, item.desc, { font: '14px Segoe UI', color: '#9fb0d0' }).setOrigin(0, 0.5);
    const dots = this.add.text(-cw / 2 + 72, 24, '', { font: '700 14px Segoe UI', color: HEX(PAL.teal) }).setOrigin(0, 0.5);
    const price = this.add.text(cw / 2 - 20, 0, '', { font: '800 18px Segoe UI', color: HEX(PAL.brass) }).setOrigin(1, 0.5);

    const card = this.add.container(cx, cy, [bg, icon, name, desc, dots, price]).setDepth(60);
    card.setSize(cw, ch).setInteractive({ useHandCursor: true });

    const refresh = () => {
      dots.setText('●'.repeat(lvl()) + '○'.repeat(item.max - lvl()) + '  (ур. ' + lvl() + '/' + item.max + ')');
      if (isMaxed(item)) { price.setText('МАКС').setColor(HEX(PAL.teal)); bg.setStrokeStyle(2, PAL.teal); }
      else {
        const c = costOf(item);
        const afford = run.budget >= c;
        price.setText(c + ' ₽').setColor(afford ? HEX(PAL.brass) : HEX(PAL.redDk));
        bg.setStrokeStyle(2, afford ? PAL.brassDk : PAL.redDk);
      }
    };
    card.on('pointerover', () => { if (!isMaxed(item)) bg.setFillStyle(PAL.office2, 1); });
    card.on('pointerout', () => bg.setFillStyle(PAL.office2, 0.92));
    card.on('pointerdown', () => this.buy(item, refresh, bg));
    card.refresh = refresh;
    refresh();
    return card;
  }

  buy(item, refresh, bg) {
    if (isMaxed(item)) { SFX.bad(); return; }
    const c = costOf(item);
    if (run.budget < c) { SFX.bad(); this.tweens.add({ targets: bg, x: '+=6', duration: 50, yoyo: true, repeat: 2 }); return; }
    run.budget -= c;
    run.upgrades[item.key] += 1;
    SFX.good();
    this.refreshBudget();
    this.cards.forEach((card) => card.refresh());   // цены/доступность могли измениться
  }
}
