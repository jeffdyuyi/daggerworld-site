import { loadAccount, readSession } from './session.js';
const entry = document.querySelector('.hero-copy .button');
const library = document.getElementById('portal-library');
if (readSession() && (library || entry)) {
  loadAccount().then(() => {
    if (library) library.href = './editor/#vault';
    if (entry) {
      entry.href = './editor/#vault';
      entry.textContent = '进入角色库';
    }
  }).catch(() => {});
}
