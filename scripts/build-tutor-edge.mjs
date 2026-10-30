import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir(new URL('../supabase/functions/quick-endpoint/',import.meta.url),{recursive:true});
await build({entryPoints:[new URL('../server/tutor-edge.mjs',import.meta.url).pathname],
  outfile:new URL('../supabase/functions/quick-endpoint/index.ts',import.meta.url).pathname,
  bundle:true,platform:'neutral',format:'esm',target:'es2022',legalComments:'eof',
  banner:{js:'// @ts-nocheck\n// GENERATED: npm run build. Paste this whole file into Supabase quick-endpoint/index.ts.\n// Contains the public exercise bank; all private keys are read from runtime secrets.'}});
