import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
await import('./build-tutor-catalog.mjs');
// Only ship browser assets. Functions are built by Cloudflare from /functions.
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
for(const file of ['index.html','theme.js','island-life.js','island-life.css','brand.css','brand.js','adaptive.js','study-content.js','study-ui.js','account.js','cloud-api.mjs','progress-sync.mjs','social.js','accessibility.css','tutor-bootstrap.js','tutor.css','tutor-ui.js','tutor-context.mjs','_routes.json']) {
 await copyFile(new URL('../'+file,import.meta.url),new URL('../dist/'+file,import.meta.url));
}
await rm(new URL('../dist/assets/',import.meta.url),{recursive:true,force:true});
await cp(new URL('../assets/',import.meta.url),new URL('../dist/assets/',import.meta.url),{recursive:true,filter:source=>!(/\.(png|ttf)$/.test(source))});
await mkdir(new URL('../dist/assets/katex/',import.meta.url),{recursive:true});
for(const file of ['katex.min.js','katex.min.css'])await copyFile(new URL('../node_modules/katex/dist/'+file,import.meta.url),new URL('../dist/assets/katex/'+file,import.meta.url));
await copyFile(new URL('../node_modules/katex/LICENSE',import.meta.url),new URL('../dist/assets/katex/LICENSE',import.meta.url));
await cp(new URL('../node_modules/katex/dist/fonts/',import.meta.url),new URL('../dist/assets/katex/fonts/',import.meta.url),{recursive:true});
console.log('Site estático preparado em dist/. A API permanece em functions/.');
