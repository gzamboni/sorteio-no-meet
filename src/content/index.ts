import { snapshot, type Snapshot } from '../lib/participants';
import { createPanel } from './panel';

const t0 = Date.now();
console.info('[Sorteio no Meet] content script carregado');
const panel = createPanel();
console.info('[Sorteio no Meet] painel criado');
let last: Snapshot = { status: 'loading', source: 'none', participants: [] };

const sig = (s: Snapshot) => s.status + s.source + s.participants.map((p) => `${p.id}|${p.name}|${p.isSelf}`).join(',');

function refresh() {
  const next = snapshot(document, location.pathname, Date.now() - t0);
  if (sig(next) === sig(last)) return;
  last = next;
  console.info('[Sorteio no Meet]', next.status, next.source, next.participants.map((p) => p.name));
  panel.update(next);
}

let timer: number | undefined;
const schedule = () => {
  clearTimeout(timer);
  timer = window.setTimeout(refresh, 300); // debounce: Meet mutates the DOM constantly
};
new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
// status flips loading → unreadable with no DOM change, so re-check periodically
setInterval(refresh, 3000);
refresh();

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === 'getState') reply({ status: last.status, count: last.participants.length });
  else if (msg?.type === 'openPanel') {
    panel.open();
    reply({ ok: true });
  }
});
