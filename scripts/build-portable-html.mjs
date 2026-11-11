import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=resolve(root,'dist');
const output=process.argv[2]||resolve(root,'../previews/missao-escola-beta-portatil.html');
const mime={'.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8'};
const cache=new Map();
function localPath(url,base=dist){const clean=url.split(/[?#]/)[0].replace(/^\.\//,'');const file=resolve(base,clean);if(!file.startsWith(dist+sep))throw Error('Asset fora de dist: '+url);return file;}
async function cssInline(file){const text=await readFile(file,'utf8');return replaceAsync(text,/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,async(full,quote,url)=>/^(data:|https?:|#)/.test(url)?full:`url("${await dataUrl(localPath(url,dirname(file)))}")`);}
async function dataUrl(file){if(cache.has(file))return cache.get(file);const data=extname(file)==='.css'?Buffer.from(await cssInline(file)):await readFile(file);const value='data:'+(mime[extname(file)]||'application/octet-stream')+';base64,'+data.toString('base64');cache.set(file,value);return value;}
async function replaceAsync(text,pattern,fn){const matches=[...text.matchAll(pattern)],values=await Promise.all(matches.map(m=>fn(...m)));let i=0;return text.replace(pattern,()=>values[i++]);}
const images=['mascot','mascot-studying','mascot-thinking','mascot-celebrating'];
const assets={};for(const image of images){const path='assets/mascot/'+image+'.webp';assets[path]=await dataUrl(localPath(path));}
for(const path of ['assets/katex/katex.min.css','assets/katex/katex.min.js'])assets[path]=await dataUrl(localPath(path));
async function scriptAssets(text){
 text=text.replace('src="./assets/mascot/${images[pose]}.webp"','src="${window.MissaoAsset(\'./assets/mascot/\'+images[pose]+\'.webp\')}"');
 return replaceAsync(text,/(['"])(\.\/assets\/[^'"\s<>$]+)\1/g,async(full,quote,url)=>/\.(css|js)$/.test(url)?'window.MissaoAsset('+JSON.stringify(url)+')':/\.(svg|webp|png|woff2?|ttf)(?:[?#].*)?$/.test(url)?JSON.stringify(await dataUrl(localPath(url))):full);
}
const fileAccount=`<div class="section-heading"><h1>Conta e recursos online</h1></div><article class="social-box"><h2>Você está usando o arquivo HTML</h2><p>Estudo, perfil e rotina funcionam neste arquivo, sem instalar programas. Os estudos ficam neste navegador; mantenha o arquivo no mesmo lugar para retomar.</p><p>Login, Tutor IA e amigos/ligas precisam de um endereço servido pela aplicação e das configurações online existentes. Esses serviços não estão disponíveis ao abrir com duplo clique.</p><a class="primary-button" href="https://raw.githubusercontent.com/newthuzz/missao-escola/main/VERS%C3%95ES/missao-escola-beta-local-2026-11-05.zip">Baixar versão com servidor local</a><p>Para copiar seus estudos, use Meu perfil → Cópias dos meus estudos.</p></article>`;
const result=await build({stdin:{contents:"import './rewards-ui.js'; import {mountTutor} from './tutor-ui.js'; window.MissaoHTMLTutor={mountTutor};",resolveDir:root,sourcefile:'portable-entry.js'},bundle:true,format:'iife',platform:'browser',target:['chrome100','firefox100','safari15.4'],write:false,minify:true,legalComments:'none',plugins:[{name:'portable-file-adapter',setup(b){b.onLoad({filter:/\.(js|mjs)$/},async args=>{
 let text=await readFile(args.path,'utf8');
 if(args.path===resolve(root,'account.js')){
  text=text.replace("try {session=JSON.parse(localStorage.getItem(SESSION_KEY));} catch {}", "try {session=location.protocol==='file:'?null:JSON.parse(localStorage.getItem(SESSION_KEY));} catch {}");
  text=text.replace("async function token(){", "async function token(){if(location.protocol==='file:')throw Error('Use a versão com servidor local para entrar na conta.');");
  text=text.replace("export const getAccountUser=()=>session?.user?.id||null;", "export const getAccountUser=()=>location.protocol==='file:'?null:session?.user?.id||null;");
  text=text.replace("function renderAccount(message=''){", "function renderAccount(message=''){if(location.protocol==='file:'){page.innerHTML="+JSON.stringify(fileAccount)+";return;}");
  text=text.replace("function startSync(){", "function startSync(){if(location.protocol==='file:'){stopSync();session=null;return;}");
  text=text.replace("async function prepareInitialAccount(){", "async function prepareInitialAccount(){if(location.protocol==='file:'){renderAccount();if(location.hash==='#social')navigate('social',false);return {connectionError:false};}");
 }
 if(args.path===resolve(root,'tutor-ui.js')){
  text=text.replace("$('tutor-access-title').textContent=user?", "$('tutor-access-title').textContent=location.protocol==='file:'?'Tutor online':user?");
  text=text.replace("$('tutor-access-note').textContent=user?", "$('tutor-access-note').textContent=location.protocol==='file:'?'Este arquivo permite testar o estudo sem servidor. Para conversar com o Tutor, use a versão com servidor local e uma conta.':user?");
  text=text.replace("$('tutor-login').hidden=Boolean(user);", "$('tutor-login').hidden=Boolean(user);if(location.protocol==='file:')$('tutor-login').textContent='Como acessar o Tutor';");
  text=text.replace("status('Entre na sua conta para conversar e guardar seu histórico.');", "status(location.protocol==='file:'?'O Tutor não funciona no modo de arquivo local.':'Entre na sua conta para conversar e guardar seu histórico.');");
 }
 return {contents:await scriptAssets(text),loader:'js',resolveDir:dirname(args.path)};
 });}}]});
let html=await readFile(resolve(dist,'index.html'),'utf8');
html=await replaceAsync(html,/<link\b[^>]*rel="stylesheet"[^>]*>/g,async tag=>{const href=/href="([^"]+)"/.exec(tag)?.[1];if(!href||/^https?:/.test(href))return tag;return '<style data-inline-source="'+href+'">'+(await cssInline(localPath(href))).replace(/<\/style/gi,'<\\/style')+'</style>';});
html=await replaceAsync(html,/<script\b([^>]*)src="([^"]+)"([^>]*)><\/script>/g,async(tag,before,src,after)=>{
 if(/type="module"/.test(before+after))return '';
 let text=await scriptAssets(await readFile(localPath(src),'utf8'));
 if(src.includes('study-ui.js'))text=text.replace("settings.addEventListener('click',e=>{if(!['export-study-data','export-study-before'].includes(e.target.id))return;try{const previous=e.target.id==='export-study-before'","document.addEventListener('click',e=>{const exportButton=e.target.closest('button');if(!['export-study-data','export-study-before'].includes(exportButton?.id))return;try{const previous=exportButton.id==='export-study-before'");
 if(src.includes('tutor-bootstrap.js')){text=text.replace("import('./tutor-ui.js')","Promise.resolve(window.MissaoHTMLTutor)");text=text.replace("const css=document.createElement('link');css.rel='stylesheet';css.href='./tutor.css';document.head.append(css);",'/* Tutor styles are embedded in this HTML. */');}
 return '<script data-inline-source="'+src+'">'+text.replace(/<\/script/gi,'<\\/script')+'</script>';
});
html=await replaceAsync(html,/\b(src|href)="(\.\/assets\/[^"$]+)"/g,async(full,attr,url)=>attr+'="'+await dataUrl(localPath(url))+'"');
const resolver='<script>window.MissaoHTMLAssets='+JSON.stringify(assets)+';window.MissaoAsset=function(path){return window.MissaoHTMLAssets[path.replace(/^\\.\\//,\"\")]||path;};</script>';
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8">'+resolver);
html=html.replace('</head>','<style data-inline-source="tutor.css">'+await cssInline(resolve(dist,'tutor.css'))+'</style></head>');
const note="if(location.protocol==='file:'){document.title='Missão Escola · Beta em HTML';const note=document.createElement('p');note.className='portable-file-note';note.textContent='Versão HTML: estudo e rotina sem servidor. Conta, Tutor e amigos/ligas precisam da versão online ou com servidor local.';document.querySelector('#page-inicio .central-heading').after(note);}";
html=html.replace('</body>',()=>'<script data-inline-source="portable-account-tutor">'+result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script><script>'+note+'</script></body>');
for(const file of ['assets/katex/LICENSE','assets/fonts/OFL-Anton.txt']){const license=await readFile(resolve(dist,file),'utf8');html=html.replace('</html>','<!-- License: '+file+'\n'+license.replace(/-->/g,'-- >')+'\n--></html>');}
await mkdir(dirname(output),{recursive:true});await writeFile(output,html);
console.log(JSON.stringify({output,bytes:Buffer.byteLength(html),embeddedAssets:cache.size,externalScripts:(html.match(/<script\b[^>]*src=/g)||[]).length}));
