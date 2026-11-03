const msg = document.getElementById('msg')!;
const openBtn = document.getElementById('open') as HTMLButtonElement;

const TEXT: Record<string, string> = {
  'not-meeting': 'Você está no Meet, mas fora de uma reunião.',
  loading: 'Reunião carregando…',
  unreadable: 'Não foi possível ler os participantes. Entre na reunião ou abra a lista "Pessoas".',
};

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    const s = await chrome.tabs.sendMessage(tab.id!, { type: 'getState' });
    msg.textContent = s.status === 'ready' ? `${s.count} participante(s) identificado(s).` : TEXT[s.status];
    openBtn.disabled = false;
    openBtn.onclick = async () => {
      await chrome.tabs.sendMessage(tab.id!, { type: 'openPanel' });
      window.close();
    };
  } catch {
    // no content script answered: not on meet.google.com, or tab loaded before install
    msg.textContent = 'Abra uma reunião do Google Meet (ou recarregue a aba do Meet) para usar o sorteio.';
  }
})();
