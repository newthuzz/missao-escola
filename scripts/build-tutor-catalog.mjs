import {readFile,mkdir,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import {exerciseVersion} from '../tutor-context.mjs';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const context=vm.createContext({});
// Execute only the repository-owned, data-only banks, never browser/app code.
for(const marker of ['root.Journey = api','root.Curriculum=data']) {
  const script=scripts.find(s=>s.includes(marker));
  if(!script)throw Error('Catálogo do tutor: banco original não encontrado.');
  vm.runInContext(script,context,{timeout:1000});
}
vm.runInContext(await readFile(new URL('../study-content.js',import.meta.url),'utf8'),context,{timeout:1000});
const c=context.Curriculum;
const catalog={version:c.version,scope:c.scope,subjects:c.subjects,units:c.units,sources:c.sources,islands:context.Journey.islands,questions:c.questions.map(q=>({...q,revision:exerciseVersion(q)}))};
await mkdir(new URL('../server/',import.meta.url),{recursive:true});
await writeFile(new URL('../server/tutor-catalog.json',import.meta.url),JSON.stringify(catalog)+'\n');
