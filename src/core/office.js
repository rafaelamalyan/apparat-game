// Процедурный фон: кабинет генерального с окном, городом, краном и светом.
import Phaser from 'phaser';
import { W, H, PAL } from './config.js';

export function buildOffice(scene) {
  const layer = scene.add.container(0, 0);

  // Стена — вертикальный градиент.
  const g = scene.add.graphics();
  for (let i = 0; i < H; i++) {
    const col = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(PAL.office2),
      Phaser.Display.Color.ValueToColor(PAL.office), H, i);
    g.fillStyle(Phaser.Display.Color.GetColor(col.r, col.g, col.b), 1);
    g.fillRect(0, i, W, 1);
  }
  layer.add(g);

  // Нижняя деревянная панель.
  const wood = scene.add.graphics();
  wood.fillStyle(0x2c2236, 1); wood.fillRect(0, H - 150, W, 150);
  wood.fillStyle(0x36283f, 1);
  for (let x = 0; x < W; x += 120) wood.fillRect(x, H - 150, 4, 150);
  layer.add(wood);

  // Окно с ночным небом.
  const win = scene.add.graphics();
  win.fillStyle(0x0e1830, 1); win.fillRoundedRect(W / 2 - 260, 70, 520, 250, 8);
  for (let i = 0; i < 250; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x2a4a7a),
      Phaser.Display.Color.ValueToColor(0x16243f), 250, i);
    win.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    win.fillRect(W / 2 - 256, 74 + i, 512, 1);
  }
  layer.add(win);

  // Силуэты города (отдельный слой для параллакса).
  const city = scene.add.container(0, 0);
  const cg = scene.add.graphics();
  cg.fillStyle(0x101c33, 0.9);
  let cx = W / 2 - 256;
  while (cx < W / 2 + 256) {
    const bw = 20 + Math.random() * 40;
    const bh = 60 + Math.random() * 150;
    cg.fillRect(cx, 74 + 250 - bh, bw, bh);
    cg.fillStyle(0xe8b04a, 0.25);
    for (let wy = 74 + 250 - bh + 8; wy < 74 + 250 - 8; wy += 14)
      for (let wx = cx + 4; wx < cx + bw - 4; wx += 10)
        if (Math.random() > 0.4) cg.fillRect(wx, wy, 4, 6);
    cg.fillStyle(0x101c33, 0.9);
    cx += bw + 6;
  }
  city.add(cg);
  layer.add(city);

  // Башенный кран на стройке.
  const crane = scene.add.graphics();
  crane.lineStyle(4, 0xe09030, 0.8);
  crane.strokeRect(W / 2 + 120, 150, 6, 160);
  crane.beginPath();
  crane.moveTo(W / 2 + 60, 160); crane.lineTo(W / 2 + 230, 160); crane.strokePath();
  crane.lineBetween(W / 2 + 90, 160, W / 2 + 90, 195);
  layer.add(crane);

  // Рама окна.
  const fr = scene.add.graphics();
  fr.lineStyle(10, 0x14203a, 1);
  fr.strokeRoundedRect(W / 2 - 260, 70, 520, 250, 8);
  fr.lineBetween(W / 2, 70, W / 2, 320);
  fr.lineBetween(W / 2 - 260, 195, W / 2 + 260, 195);
  layer.add(fr);

  // Луч света из окна на пол.
  const lightG = scene.add.graphics();
  lightG.fillStyle(0xe8b04a, 0.06);
  lightG.fillTriangle(W / 2 - 200, 320, W / 2 + 200, 320, W / 2, H - 150);
  layer.add(lightG);

  return { layer, city };
}
