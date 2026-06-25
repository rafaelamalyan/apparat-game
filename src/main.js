// Точка входа: конфигурация Phaser и запуск сцен.
import Phaser from 'phaser';
import { W, H, PAL, HEX } from './core/config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import ShopScene from './scenes/ShopScene.js';
import OverScene from './scenes/OverScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: HEX(PAL.ink),
  // Адаптив: поле вписывается в любой экран с сохранением пропорций.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, GameScene, ShopScene, OverScene],
});

if (import.meta.env.DEV) window.__APPARAT__ = game;
