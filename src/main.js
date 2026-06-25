// Точка входа: конфигурация Phaser и запуск сцен.
import Phaser from 'phaser';
import { W, H, PAL, HEX } from './core/config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import OverScene from './scenes/OverScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game',
  backgroundColor: HEX(PAL.ink),
  scene: [BootScene, MenuScene, GameScene, OverScene],
});
