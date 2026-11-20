import {loadAdventureCards, writeAdventureCard} from '../session.js?v=20261121-board1';

export function setupAdventureBoard() {
  const byId = id => document.getElementById(id);
  const form = byId('adventure-form'), dialog = byId('adventure-dialog');
  const status = byId('adventure-status');
  const categories = {journal:'冒险笔记',npc:'NPC 记录',clue:'线索墙'};
  let selected = null;
  let loading = false;
  function edit(card) {
    selected = card;
    form.elements.category.value = card?.category ?? 'journal';
    form.elements.title.value = card?.title ?? '';
    form.elements.body.value = card?.body ?? '';
    byId('adventure-edit-status').textContent = '';
    byId('adventure-remove').hidden = !card;
    dialog.showModal();
  }
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const rows = await loadAdventureCards();
      for (const [kind,label] of Object.entries(categories)) {
        const column = byId('adventure-'+kind);
        const heading = document.createElement('h3');
        heading.textContent = label;
        column.replaceChildren(heading);
        for (const card of rows.filter(row => row.category === kind)) {
          const entry = document.createElement('article');
          const title = document.createElement('h4');
          title.textContent = card.title;
          const body = document.createElement('p');
          body.textContent = card.body;
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'dw-btn dw-btn-outline';
          button.textContent = '编辑';
          button.onclick = () => edit(card);
          entry.append(title,body,button);
          column.append(entry);
        }
      }
      status.textContent = '';
    } catch (error) { status.textContent = error.message; }
    finally { loading = false; }
  }
  let saving = false;
  async function commit(remove) {
    if (saving) return;
    if (remove && (!selected || !confirm('删除这张记录？'))) return;
    const fields = Object.fromEntries(new FormData(form));
    fields.title = fields.title.trim();
    if (!remove && !fields.title) {
      byId('adventure-edit-status').textContent = '请输入标题。';
      return;
    }
    saving = true;
    byId('adventure-save').disabled = true;
    byId('adventure-remove').disabled = true;
    try { await writeAdventureCard(fields,selected,remove); dialog.close(); await refresh(); }
    catch (error) { byId('adventure-edit-status').textContent = error.message; }
    finally {
      saving = false;
      byId('adventure-save').disabled = false;
      byId('adventure-remove').disabled = false;
    }
  }
  form.onsubmit = event => { event.preventDefault(); void commit(false); };
  byId('adventure-remove').onclick = () => void commit(true);
  byId('adventure-cancel').onclick = () => { if (!saving) dialog.close(); };
  dialog.addEventListener('cancel',event => { if (saving) event.preventDefault(); });
  byId('adventure-new').onclick = () => { if (!saving) edit(null); };
  byId('adventure-refresh').onclick = refresh;
  window.setInterval(() => {
    if (!document.hidden && byId('page-adventure').classList.contains('active') &&
        !byId('layer-sheet').hidden && !dialog.open) void refresh();
  },15000);
  return refresh;
}
