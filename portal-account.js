import { loadAccount, readSession } from './session.js';
const entry = document.querySelector('.hero-copy .button');
if (entry) {
  entry.href = './account.html';
  entry.removeAttribute('target');
  entry.textContent = '注册／登录 ›';
  if (readSession()) loadAccount().then(account => {
    entry.href = './editor/';
    entry.textContent = account.role === 'gm' || account.characters.length ? '角色管理 ›' : '录入角色卡 ›';
  }).catch(() => {});
}
