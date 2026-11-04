# Sorteio no Meet

Extensão Chrome (Manifest V3) que sorteia um participante da reunião do Google Meet, com roleta animada e confetes. Tudo local: sem servidores, analytics ou telemetria.

## Instalação

```sh
npm install
npm run build        # gera dist/
```

Chrome → `chrome://extensions` → ativar **Modo do desenvolvedor** → **Carregar sem compactação** → selecionar `dist/`.
Abas do Meet já abertas precisam ser recarregadas uma vez.

## Uso

1. Entre numa reunião e clique no ícone da extensão na barra do Chrome. Abre uma **janela própria** (fora da aba do Meet), que você move para onde não cubra as câmeras. Clicar de novo foca a janela já aberta.
2. **Sortear participante**. Cada pessoa é sorteada uma vez só (identificada pelo nome, então sair e voltar não a reabilita). Três listas: **Não sorteados** (o sorteio sai daqui), **Já sorteados** e **Desmarcados** (desmarque para tirar do sorteio). Efeitos sonoros: off por padrão. **Resetar sorteio** devolve todos os sorteados para a primeira lista.
3. Histórico da sessão fica só em memória (some ao fechar a janela). Botão "limpar" apaga.

A janela está ligada à aba em que você clicou. Se recarregar essa aba, feche e reabra a janela.

## Desenvolvimento

`npm test` (Vitest + happy-dom) · `npm run typecheck` · `npm run watch`

Estrutura: `src/background.ts` (ícone → abre janela) · `src/app/` (UI da janela) · `src/lib/draw.ts` (sorteio, sem UI) · `src/lib/participants.ts` (leitura do DOM) · `src/lib/animation.ts` (só apresentação; recebe o vencedor já escolhido) · `src/content/` (só lê participantes e responde à janela).

## Permissões

| Item | Motivo |
|---|---|
| content script em `https://meet.google.com/*` | ler os participantes da página |
| `permissions: []` | a janela fala com a aba via `tabs.sendMessage`; não precisa de `tabs`/`activeTab` |
| service worker | só abre/foca a janela ao clicar no ícone; sem estado, pode ser suspenso |

## Como a identificação de participantes funciona

Sem APIs privadas nem interceptação de rede; só leitura do DOM visível, com debounce de 300 ms via `MutationObserver` (+ checagem a cada 3 s):

1. **Painel "Pessoas"** (fonte completa): listas `role="list"` cujo `aria-label` lembra "participantes/people", itens `role="listitem"`; nome vem do `aria-label` do item. Só existe no DOM com o painel aberto.
2. **Fallback — tiles de vídeo**: elementos `[data-participant-id]`; nome = marcador `[data-self-name]` (você) ou primeiro texto-folha que não seja ícone.
3. Nada encontrado → estado "carregando" (10 s) e depois "não foi possível ler", nunca participantes inventados.

Duplicatas: por `data-participant-id` (mesmo nome com ids diferentes = pessoas diferentes); sem id, por nome. Sufixo "(Você)/(You)" é removido e marca o próprio usuário.

### Limitações conhecidas

- **Seletores não validados em reunião real nesta versão.** Foram escritos a partir de conhecimento da estrutura do Meet e testados só contra fixtures. Antes de usar, valide numa reunião real (critérios 4 e 5 da spec). Se falhar, ajuste `src/lib/participants.ts` e as fixtures em `participants.test.ts`.
- Pelos tiles, só entram participantes renderizados (o Meet pagina a grade em reuniões grandes). Abra "Pessoas" para a lista completa; a janela avisa quando usa o fallback.
- Heurística de nome nos tiles pode pegar rótulos extras (ex.: "Fixado") se o Meet mudar a estrutura.
- Apresentações de tela podem aparecer como tile separado.
- Reconhecimento do "(Você)" cobre pt, en, es, fr, de.
- Sem estado "participantes sendo atualizados" visível: a lista atualiza com debounce, sem indicador.
- Ícones PNG não incluídos (Chrome usa o padrão).
- Playwright não configurado: o Meet exige login Google, então testes de UI contra ele não são viáveis; a lógica é coberta por Vitest.
