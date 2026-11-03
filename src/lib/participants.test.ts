import { beforeEach, describe, expect, it } from 'vitest';
import { isMeetingPath, readParticipants, snapshot } from './participants';

// Fixtures mimic the structure documented in README ("Como a identificação funciona").
const panelHtml = `
<div role="list" aria-label="Participantes">
  <div role="listitem" aria-label="Ana Souza" data-participant-id="p1"><span>Ana Souza</span><i class="google-symbols">mic_off</i></div>
  <div role="listitem" aria-label="Bruno (Você)" data-participant-id="p2"><span>Bruno (Você)</span></div>
  <div role="listitem" aria-label="Ana Souza" data-participant-id="p1"><span>Ana Souza</span></div>
  <div role="listitem" aria-label="Ana Souza" data-participant-id="p3"><span>Ana Souza</span></div>
</div>
<div role="list" aria-label="Mensagens"><div role="listitem" aria-label="chat msg"></div></div>`;

const tilesHtml = `
<div data-participant-id="t1"><i class="google-symbols">more_vert</i><span>Carla</span></div>
<div data-participant-id="t2"><span data-self-name="Você">Dani</span></div>
<div data-participant-id="t3"><i class="google-symbols">keep</i></div>`;

beforeEach(() => (document.body.innerHTML = ''));

describe('readParticipants', () => {
  it('reads panel, strips self suffix, dedupes by id, keeps same-name distinct ids, ignores other lists', () => {
    document.body.innerHTML = panelHtml;
    const r = readParticipants(document);
    expect(r.source).toBe('panel');
    expect(r.participants).toEqual([
      { id: 'p1', name: 'Ana Souza', isSelf: false },
      { id: 'p2', name: 'Bruno', isSelf: true },
      { id: 'p3', name: 'Ana Souza', isSelf: false },
    ]);
  });
  it('falls back to tiles, skipping icon text and nameless tiles', () => {
    document.body.innerHTML = tilesHtml;
    const r = readParticipants(document);
    expect(r.source).toBe('tiles');
    expect(r.participants).toEqual([
      { id: 't1', name: 'Carla', isSelf: false },
      { id: 't2', name: 'Dani', isSelf: true },
    ]);
  });
  it('returns none on unknown structure', () => {
    document.body.innerHTML = '<div>hello</div>';
    expect(readParticipants(document)).toEqual({ source: 'none', participants: [] });
  });
});

describe('snapshot', () => {
  it('not-meeting on landing page', () => {
    expect(snapshot(document, '/', 0).status).toBe('not-meeting');
  });
  it('loading then unreadable when nothing found', () => {
    expect(snapshot(document, '/abc-defg-hij', 1000).status).toBe('loading');
    expect(snapshot(document, '/abc-defg-hij', 60_000).status).toBe('unreadable');
  });
  it('lobby: self preview tile but no leave button', () => {
    document.body.innerHTML = tilesHtml;
    expect(snapshot(document, '/abc-defg-hij', 0).status).toBe('lobby');
  });
  it('ready once leave button exists (icon or label)', () => {
    document.body.innerHTML = tilesHtml + '<button><i class="google-symbols">call_end</i></button>';
    expect(snapshot(document, '/abc-defg-hij', 0).status).toBe('ready');
    document.body.innerHTML = tilesHtml + '<button aria-label="Sair da chamada"></button>';
    expect(snapshot(document, '/abc-defg-hij', 0).status).toBe('ready');
  });
  it('meeting path matching', () => {
    expect(isMeetingPath('/abc-defg-hij')).toBe(true);
    expect(isMeetingPath('/meet/wcy-kzev-bbv')).toBe(true);
    expect(isMeetingPath('/landing')).toBe(false);
  });
});
