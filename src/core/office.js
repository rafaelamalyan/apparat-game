// Фон-кабинет: рисованная иллюстрация генерального + лёгкий тёплый скрим
// для читаемости персонажей и папок поверх.
import { W, H, PAL } from './config.js';

export function buildOffice(scene) {
  const bg = scene.add.image(0, 0, 'office').setOrigin(0).setDepth(0);
  bg.setDisplaySize(W, H);
  // Тёплый притеняющий слой — мягко уводит фон назад, повышает контраст.
  const scrim = scene.add.rectangle(0, 0, W, H, 0x140c04, 0.26).setOrigin(0).setDepth(1);
  return { bg, scrim, city: null };
}
