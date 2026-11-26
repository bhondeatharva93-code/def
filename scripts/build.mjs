import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dist');

async function build() {
  fs.mkdirSync(outDir, { recursive: true });

  await Promise.all([
    esbuild.build({
      entryPoints: [path.join(root, 'src', 'data', 'public-bridge.ts')],
      bundle: true,
      minify: true,
      sourcemap: false,
      format: 'iife',
      platform: 'browser',
      target: ['es2020'],
      outfile: path.join(outDir, 'data-api.js'),
    }),
    esbuild.build({
      entryPoints: [path.join(root, 'src', 'admin', 'main.tsx')],
      bundle: true,
      minify: true,
      sourcemap: false,
      format: 'iife',
      platform: 'browser',
      target: ['es2020'],
      jsx: 'automatic',
      outfile: path.join(outDir, 'admin.js'),
    }),
  ]);

  console.log('Built dist/data-api.js and dist/admin.js successfully.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
