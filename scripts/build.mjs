import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
// Only ship browser assets. Functions are built by Cloudflare from /functions.
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
for(const file of ['index.html','theme.js','island-life.js','island-life.css','brand.css','brand.js','adaptive.js','study-content.js','study-ui.js','account.js','cloud-api.mjs','progress-sync.mjs','social.js','accessibility.css','_routes.json']) {
 await copyFile(new URL('../'+file,import.meta.url),new URL('../dist/'+file,import.meta.url));
}
await rm(new URL('../dist/assets/',import.meta.url),{recursive:true,force:true});
await cp(new URL('../assets/',import.meta.url),new URL('../dist/assets/',import.meta.url),{recursive:true,filter:source=>!(/\.(png|ttf)$/.test(source))});
console.log('Site estático preparado em dist/. A API permanece em functions/.');
