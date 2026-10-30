import {mkdir,copyFile} from 'node:fs/promises';
// Only ship browser assets. Functions are built by Cloudflare from /functions.
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
for(const file of ['index.html','adaptive.js','study-content.js','study-ui.js','account.js','cloud-api.mjs','social.js','accessibility.css','_routes.json']) {
 await copyFile(new URL('../'+file,import.meta.url),new URL('../dist/'+file,import.meta.url));
}
console.log('Site estático preparado em dist/. A API permanece em functions/.');
