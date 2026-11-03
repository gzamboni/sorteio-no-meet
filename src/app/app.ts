import { beep, confetti, prefersReducedMotion, spin } from '../lib/animation';
import { eligible, pick, type HistoryEntry, type Options } from '../lib/draw';
import type { Snapshot } from '../lib/participants';

const STATUS_MSG: Record<string, string> = {
  'not-meeting': 'Esta aba do Meet não está em uma reunião.',
  lobby: 'Entre na reunião para sortear.',
  loading: 'Carregando a reunião…',
  unreadable:
    'Não consegui ler os participantes. Entre na reunião ou abra a lista "Pessoas"; se persistir, a interface do Meet pode ter mudado.',
};
const OFFLINE_MSG =
  'Não consegui falar com a aba do Meet. Ela foi fechada ou precisa ser recarregada (F5). Depois, feche e reabra esta janela.';

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const [status, stage, note, chips, histBox, hist] = ['.status', '.stage', '.note', '.chips', '.histbox', '.hist'].map((s) => $(s));
const [go, reset] = [$<HTMLButtonElement>('.go'), $<HTMLButtonElement>('.reset')];
const [oRep, oSnd] = ['.o-rep', '.o-snd'].map((s) => $<HTMLInputElement>(s));

const tabId = Number(new URLSearchParams(location.search).get('tab'));
let snap: Snapshot = { status: 'loading', source: 'none', participants: [] };
let offline = false;
let busy = false;
let chipsKey = '';
let winner: { id: string; name: string } | null = null;
const drawn = new Set<string>();
const excluded = new Set<string>(); // manually unchecked in the list
const history: HistoryEntry[] = []; // in memory only, by design
const opts = (): Options => ({ noRepeat: oRep.checked });

function render() {
  const ready = !offline && snap.status === 'ready';
  status.textContent = offline
    ? OFFLINE_MSG
    : ready
      ? `${snap.participants.length} participante(s) identificado(s)` +
        (snap.source === 'tiles' ? ' (só quem está visível na tela; abra "Pessoas" no Meet para a lista completa)' : '')
      : STATUS_MSG[snap.status];
  status.classList.toggle('err', offline || snap.status === 'unreadable');
  const pool = ready ? eligible(snap.participants, opts(), drawn, excluded) : [];
  go.disabled = busy || !pool.length;
  reset.disabled = busy;
  go.textContent = winner ? 'Sortear novamente' : 'Sortear participante';
  if (ready && !pool.length && !busy) {
    note.textContent = 'Nenhum participante elegível com as opções atuais.';
    note.hidden = false;
  } else if (winner && !busy && ready && !snap.participants.some((p) => p.id === winner!.id)) {
    note.textContent = `${winner.name} saiu da reunião. Sorteie novamente se quiser.`;
    note.hidden = false;
  } else note.hidden = true;
  // rebuild only on change: polling every second must not steal keyboard focus
  const key = snap.participants.map((p) => p.id + p.name + excluded.has(p.id)).join('|');
  if (key !== chipsKey) {
    chipsKey = key;
    chips.replaceChildren(
      ...snap.participants.map((p) => {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !excluded.has(p.id);
        cb.onchange = () => {
          if (cb.checked) excluded.delete(p.id);
          else excluded.add(p.id);
          render();
        };
        label.append(cb, p.name + (p.isSelf ? ' (você)' : ''));
        li.append(label);
        return li;
      }),
    );
  }
  histBox.hidden = !history.length;
  hist.replaceChildren(
    ...history.map((h) => {
      const li = document.createElement('li');
      const [a, b, c] = [0, 1, 2].map(() => document.createElement('span'));
      a.textContent = `#${h.n}`;
      b.textContent = h.name;
      c.className = 't';
      c.textContent = h.time.toLocaleTimeString();
      li.append(a, b, c);
      return li;
    }),
  );
}

go.onclick = async () => {
  const pool = eligible(snap.participants, opts(), drawn, excluded);
  if (busy || !pool.length) return;
  const chosen = pick(pool); // decided before any animation
  busy = true;
  winner = null;
  stage.classList.remove('win');
  note.hidden = true;
  render();
  await spin(stage, pool.map((p) => p.name), chosen.name, {
    reduced: prefersReducedMotion(),
    onTick: oSnd.checked ? () => beep() : undefined,
  });
  busy = false;
  winner = chosen;
  drawn.add(chosen.id);
  history.unshift({ n: history.length + 1, name: chosen.name, time: new Date() });
  stage.classList.add('win');
  if (!prefersReducedMotion()) {
    confetti(document.body);
    if (oSnd.checked) beep(880, 300);
  }
  render();
};

// keeps history; "limpar" handles that
reset.onclick = () => {
  if (busy) return;
  drawn.clear();
  winner = null;
  stage.classList.remove('win');
  stage.textContent = 'Pronto para sortear';
  render();
};
$('.clear').onclick = () => {
  history.length = 0;
  render();
};
oRep.onchange = render;

async function poll() {
  try {
    snap = await chrome.tabs.sendMessage(tabId, { type: 'getState' });
    offline = false;
  } catch {
    offline = true; // tab closed, not Meet, or loaded before install
  }
  render();
}
setInterval(poll, 1000);
poll();
