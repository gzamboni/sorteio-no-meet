// Pure presentation. The winner is chosen BEFORE and passed in; nothing here picks.

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const TICKS = 28;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Cycles names in `reel`, slowing down (ease-out), landing on `winner`. */
export async function spin(
  reel: HTMLElement,
  names: string[],
  winner: string,
  opts: { reduced: boolean; onTick?: () => void },
): Promise<void> {
  if (opts.reduced) {
    reel.textContent = winner;
    return;
  }
  let prev = '';
  for (let i = 0; i < TICKS; i++) {
    let name = i === TICKS - 1 ? winner : names[Math.floor(Math.random() * names.length)]; // cosmetic only
    if (names.length > 1) while (name === prev && i < TICKS - 1) name = names[Math.floor(Math.random() * names.length)];
    prev = name;
    const span = document.createElement('span');
    span.className = 'tick';
    span.textContent = name;
    reel.replaceChildren(span);
    opts.onTick?.();
    await wait(45 + 330 * (i / TICKS) ** 3);
  }
}

export function confetti(host: HTMLElement): void {
  const win = host.ownerDocument.defaultView ?? window;
  const cv = host.ownerDocument.createElement('canvas');
  cv.className = 'confetti';
  cv.width = win.innerWidth;
  cv.height = win.innerHeight;
  host.append(cv);
  const g = cv.getContext('2d')!;
  const colors = ['#f44336', '#ffc107', '#4caf50', '#2196f3', '#9c27b0', '#ff9800'];
  const ps = Array.from({ length: 140 }, () => ({
    x: cv.width / 2 + (Math.random() - 0.5) * 200,
    y: cv.height * 0.4,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 14 - 4,
    s: 4 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
    r: Math.random() * Math.PI,
  }));
  const t0 = performance.now();
  const frame = (t: number) => {
    const k = (t - t0) / 2200;
    if (k >= 1) return cv.remove();
    g.clearRect(0, 0, cv.width, cv.height);
    g.globalAlpha = 1 - k * k;
    for (const p of ps) {
      p.vy += 0.35;
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.15;
      g.fillStyle = p.c;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.r);
      g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      g.restore();
    }
    win.requestAnimationFrame(frame);
  };
  win.requestAnimationFrame(frame);
}

let ac: AudioContext | undefined;
export function beep(freq = 600, ms = 40): void {
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    g.gain.value = 0.04;
    o.frequency.value = freq;
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + ms / 1000);
  } catch {
    /* audio is optional */
  }
}
