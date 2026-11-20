import { readSession } from './session.js';

const entry = document.querySelector('.hero-copy .button');
if (entry && readSession()) entry.textContent = '继续游戏';
