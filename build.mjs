import { build, context } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');
const opts = {
  entryPoints: { content: 'src/content/index.ts', popup: 'src/popup/popup.ts' },
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  target: 'chrome110',
  loader: { '.css': 'text' },
  minify: !watch,
  logLevel: 'info',
};

mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });
if (watch) await (await context(opts)).watch();
else await build(opts);
