import {build} from 'esbuild';

await build({
  entryPoints: [new URL('../server/essay-edge.mjs', import.meta.url).pathname],
  outfile: new URL('../supabase/functions/essay-review/index.ts', import.meta.url).pathname,
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  target: 'es2022',
  legalComments: 'eof',
  banner: {js:'// @ts-nocheck\n// GENERATED: node scripts/build-essay-edge.mjs. Runtime secrets are read by the Edge Function.'}
});
