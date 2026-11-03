export type Participant = { id: string; name: string; isSelf: boolean };
export type Source = 'panel' | 'tiles' | 'none';
export type Status = 'not-meeting' | 'loading' | 'unreadable' | 'ready';
export type Snapshot = { status: Status; source: Source; participants: Participant[] };

// Icon-font glyphs ("mic_off", "more_vert") are text nodes too; skip them.
const ICON = '.google-symbols,.material-icons,.material-icons-extended,.material-symbols-outlined,[aria-hidden="true"]';
const ICON_LIGATURE = /^[a-z]+(_[a-z]+)+$/;
const SELF_SUFFIX = /\s*\((you|você|voce|tú|vous|du)\)\s*$/i;
const PANEL_LABEL = /particip|people|pessoas|teilnehmer|persone|personnes/i;

function leafText(el: Element): string {
  for (const n of el.querySelectorAll('*')) {
    if (n.children.length || n.closest(ICON)) continue;
    const t = n.textContent?.trim() ?? '';
    if (t && t.length <= 80 && !ICON_LIGATURE.test(t)) return t;
  }
  return '';
}

function make(rawName: string, id: string | null, isSelfHint: boolean): Participant | null {
  const isSelf = isSelfHint || SELF_SUFFIX.test(rawName);
  const name = rawName.replace(SELF_SUFFIX, '').trim();
  if (!name) return null;
  return { id: id || `n:${name}`, name, isSelf };
}

function fromPanel(root: ParentNode): Participant[] {
  const out: Participant[] = [];
  for (const list of root.querySelectorAll('[role="list"]')) {
    if (!PANEL_LABEL.test(list.getAttribute('aria-label') ?? '')) continue;
    for (const item of list.querySelectorAll('[role="listitem"]')) {
      const raw = item.getAttribute('aria-label')?.trim() || leafText(item);
      const p = make(raw, item.getAttribute('data-participant-id'), false);
      if (p) out.push(p);
    }
  }
  return out;
}

function fromTiles(root: ParentNode): Participant[] {
  const out: Participant[] = [];
  for (const tile of root.querySelectorAll('[data-participant-id]')) {
    if (tile.closest('[role="listitem"]')) continue;
    const selfEl = tile.querySelector('[data-self-name]');
    const raw = selfEl
      ? selfEl.textContent?.trim() || selfEl.getAttribute('data-self-name') || ''
      : leafText(tile);
    const p = make(raw, tile.getAttribute('data-participant-id'), !!selfEl);
    if (p) out.push(p);
  }
  return out;
}

function dedupe(ps: Participant[]): Participant[] {
  const m = new Map<string, Participant>();
  for (const p of ps) if (!m.has(p.id)) m.set(p.id, p);
  return [...m.values()];
}

/**
 * Strategy: People panel (complete list, only when open) → video tiles
 * (only those rendered) → none. Never invents participants.
 */
export function readParticipants(root: ParentNode): { source: Source; participants: Participant[] } {
  const panel = dedupe(fromPanel(root));
  if (panel.length) return { source: 'panel', participants: panel };
  const tiles = dedupe(fromTiles(root));
  if (tiles.length) return { source: 'tiles', participants: tiles };
  return { source: 'none', participants: [] };
}

// Real URLs seen: /abc-defg-hij and /meet/abc-defg-hij
const MEET_PATH = /^(\/meet)?\/[a-z]{3,4}-[a-z]{4}-[a-z]{3,4}\/?$/i;
export const isMeetingPath = (path: string) => MEET_PATH.test(path);

/** Grace period before "nothing found" is reported as an unreadable page. */
export const LOADING_MS = 10_000;

export function snapshot(root: ParentNode, path: string, sinceStartMs: number): Snapshot {
  if (!isMeetingPath(path)) return { status: 'not-meeting', source: 'none', participants: [] };
  const { source, participants } = readParticipants(root);
  if (source === 'none') {
    return { status: sinceStartMs < LOADING_MS ? 'loading' : 'unreadable', source, participants };
  }
  return { status: 'ready', source, participants };
}
