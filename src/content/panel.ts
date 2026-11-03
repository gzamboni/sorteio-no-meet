import css from './panel.css';
import { beep, confetti, prefersReducedMotion, spin } from '../lib/animation';
import { eligible, pick, type HistoryEntry, type Options } from '../lib/draw';
import type { Participant, Snapshot } from '../lib/participants';

const STATUS_MSG: Record<string, string> = {
  'not-meeting': 'Entre em uma reunião do Meet para sortear.',
  lobby: 'Entre na reunião para sortear.',
  loading: 'Carregando a reunião…',
  unreadable:
    'Não consegui ler os participantes. Entre na reunião ou abra a lista "Pessoas"; se persistir, a interface do Meet pode ter mudado.',
};

const HTML = `
<div class="root">
  <button class="fab" aria-label="Abrir sorteio" title="Sorteio no Meet">🎲</button>
  <section class="panel" role="dialog" aria-label="Sorteio de participante" hidden>
    <header>
      <h2>🎲 Sorteio</h2>
      <button class="pop" aria-label="Abrir em janela flutuante" title="Janela flutuante (fora da tela do Meet)">⧉</button>
      <button class="min" aria-label="Minimizar" title="Minimizar">–</button>
      <button class="close" aria-label="Fechar" title="Fechar">✕</button>
    </header>
    <div class="body">
      <p class="status" role="status"></p>
      <div class="stage" aria-live="polite">Pronto para sortear</div>
      <p class="note" hidden></p>
      <button class="go">Sortear participante</button>
      <button class="reset link" title="Esquece quem já foi sorteado e limpa o resultado">Resetar sorteio</button>
      <fieldset>
        <label><input type="checkbox" class="o-self"> Excluir a mim</label>
        <label><input type="checkbox" class="o-rep"> Não repetir sorteados</label>
        <label><input type="checkbox" class="o-snd"> Efeitos sonoros</label>
      </fieldset>
      <div><h3>Participantes</h3><ul class="chips"></ul></div>
      <div class="histbox" hidden>
        <h3>Histórico <button class="link clear">limpar</button></h3>
        <ul class="hist"></ul>
      </div>
    </div>
  </section>
</div>`;

export function createPanel() {
  const host = document.createElement('div');
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${css}</style>${HTML}`;
  const $ = <T extends HTMLElement>(s: string) => shadow.querySelector<T>(s)!;
  const [fab, panel, body, status, stage, note, chips, histBox, hist] = [
    '.fab', '.panel', '.body', '.status', '.stage', '.note', '.chips', '.histbox', '.hist',
  ].map((s) => $(s));
  const go = $<HTMLButtonElement>('.go');
  const reset = $<HTMLButtonElement>('.reset');
  const [oSelf, oRep, oSnd] = ['.o-self', '.o-rep', '.o-snd'].map((s) => $<HTMLInputElement>(s));

  let snap: Snapshot = { status: 'loading', source: 'none', participants: [] };
  let busy = false;
  let winner: Participant | null = null;
  const drawn = new Set<string>();
  const history: HistoryEntry[] = []; // in memory only, by design
  const opts = (): Options => ({ excludeSelf: oSelf.checked, noRepeat: oRep.checked });

  function render() {
    const ready = snap.status === 'ready';
    status.textContent = ready
      ? `${snap.participants.length} participante(s) identificado(s)` +
        (snap.source === 'tiles' ? ' (só quem está visível na tela; abra "Pessoas" para a lista completa)' : '')
      : STATUS_MSG[snap.status];
    status.classList.toggle('err', snap.status === 'unreadable');
    const pool = ready ? eligible(snap.participants, opts(), drawn) : [];
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
    chips.replaceChildren(
      ...snap.participants.map((p) => {
        const li = document.createElement('li');
        li.textContent = p.name + (p.isSelf ? ' (você)' : '');
        return li;
      }),
    );
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
    const pool = eligible(snap.participants, opts(), drawn);
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
      confetti(shadow);
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

  // 🎲 only while a call is open (participants readable) and the panel is closed
  let inCall = false;
  const syncFab = () => (fab.hidden = !inCall || !panel.hidden);
  const show = (open: boolean) => {
    panel.hidden = !open;
    syncFab();
    if (open) go.focus();
    else if (!fab.hidden) fab.focus();
  };
  // Document Picture-in-Picture (Chrome 116+): same DOM + JS state, moved to a floating window.
  let pip: Window | null = null;
  $('.pop').onclick = async () => {
    if (pip) return pip.close();
    const api = (window as any).documentPictureInPicture;
    if (!api) {
      note.textContent = 'Janela flutuante não suportada neste navegador (precisa do Chrome 116+).';
      note.hidden = false;
      return;
    }
    try {
      const w: Window = await api.requestWindow({ width: 340, height: 560 });
      pip = w;
      w.document.body.style.margin = '0';
      host.style.display = 'block';
      $('.root').classList.add('pip');
      show(true);
      w.document.body.append(host);
      w.addEventListener('pagehide', () => {
        pip = null;
        $('.root').classList.remove('pip');
        host.style.display = '';
        document.body.append(host);
        show(false);
      });
    } catch (e) {
      note.textContent = `Não foi possível abrir a janela flutuante: ${(e as Error).message}`;
      note.hidden = false;
    }
  };
  fab.onclick = () => show(true);
  $('.close').onclick = () => (pip ? pip.close() : show(false));
  $('.min').onclick = () => (body.hidden = !body.hidden);
  $('.clear').onclick = () => {
    history.length = 0;
    render();
  };
  for (const o of [oSelf, oRep]) o.onchange = render;
  panel.addEventListener('keydown', (e) => e.key === 'Escape' && show(false));

  render();
  document.body.append(host);

  return {
    open: () => show(true),
    update(s: Snapshot) {
      snap = s;
      inCall = s.status === 'ready';
      if (!inCall && !pip) panel.hidden = true; // call ended / left
      syncFab();
      render();
    },
  };
}
