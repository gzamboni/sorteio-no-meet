import { build, context } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: { content: 'src/content/index.ts', app: 'src/app/app.ts', background: 'src/background.ts' },
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'chrome110',
  minify: !watch,
  logLevel: 'info',
};

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });
if (watch) await (await context(opts)).watch();
else await build(opts);
