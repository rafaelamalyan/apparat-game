// Загрузка спрайтов персонажей и генерация процедурных текстур
// (папки-поручения, частицы, виньетка).
import Phaser from 'phaser';
import { W, H, DEPTS } from '../core/config.js';

const CHARS = ['karen_idle', 'karen_throw', 'karen_angry', 'sergey_idle', 'sergey_catch', 'sergey_carry', 'olya_catch', 'olya_carry'];

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    for (const k of CHARS) this.load.image(k, `sprites/${k}.png`);
    this.load.image('office', 'bg/office.jpg');
  }

  create() {
    this.makeFolders();
    this.makePaper();
    this.makeSpark();
    this.makeDust();
    this.makeVignette();
    // Ждём шрифты (для чёткого текста), но не дольше 1.5с —
    // иначе при медленной/заблокированной сети игра не стартовала бы.
    const fonts = Promise.all([
      '700 40px "PT Serif"', '400 16px "PT Sans"', '700 16px "PT Sans"',
    ].map((f) => document.fonts.load(f))).catch(() => {});
    const timeout = new Promise((res) => setTimeout(res, 1500));
    let started = false;
    const go = () => { if (!started) { started = true; this.scene.start('Menu'); } };
    Promise.race([fonts, timeout]).then(go);
  }

  // Цветная папка-поручение под департамент (или серая).
  makeFolder(key, body, tab, line) {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.22); g.fillRoundedRect(5, 9, 56, 68, 9);     // тень
    g.fillStyle(body, 1);        g.fillRoundedRect(2, 4, 56, 68, 9);     // корпус
    g.fillStyle(tab, 1);         g.fillRoundedRect(2, 4, 56, 20, 9); g.fillRect(2, 16, 56, 8); // язычок
    g.lineStyle(3, line, 1);     g.strokeRoundedRect(2, 4, 56, 68, 9);   // окантовка
    g.fillStyle(0xffffff, 0.92); g.fillRoundedRect(11, 30, 42, 34, 4);   // бумаги
    g.fillStyle(line, 0.55);
    g.fillRect(16, 38, 32, 3); g.fillRect(16, 46, 32, 3); g.fillRect(16, 54, 22, 3);
    g.generateTexture('task_' + key, 64, 80);
    g.destroy();
  }

  makeFolders() {
    DEPTS.forEach((d) => this.makeFolder(d.key, d.color, d.dark, d.light));
    this.makeFolder('grey', 0x8d96a8, 0x6c7588, 0xc4ccd9);
  }

  makePaper() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1); g.fillRect(0, 0, 22, 28);
    g.fillStyle(0xcccccc, 1);
    g.fillRect(3, 5, 16, 2); g.fillRect(3, 10, 16, 2); g.fillRect(3, 15, 11, 2);
    g.generateTexture('paper', 22, 28); g.destroy();
  }

  makeSpark() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 8);
    g.generateTexture('spark', 16, 16); g.destroy();
  }

  makeDust() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 4);
    g.generateTexture('dust', 8, 8); g.destroy();
  }

  makeVignette() {
    const c = this.textures.createCanvas('vig', W, H);
    const ctx = c.context;
    const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    c.refresh();
  }
}
