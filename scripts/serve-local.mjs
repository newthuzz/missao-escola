import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {onRequest} from '../functions/api/social.js';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),port=Number(process.env.LOCAL_PORT)||4173;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
 try{
  const host=req.headers.host||'localhost:'+port;if(!['localhost:'+port,'127.0.0.1:'+port].includes(host)){res.writeHead(403);res.end();return;}const url=new URL(req.url,'http://'+host);
  if(url.pathname.startsWith('/api/')){
   if(url.pathname!=='/api/social'){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Rota não encontrada.'}));return;}
   if(!process.env.SUPABASE_SERVICE_ROLE_KEY){res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify({error:'Amigos e ligas indisponíveis neste teste local: backend não configurado.'}));return;}
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
   const response=await onRequest({request,env:{SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:process.env.SUPABASE_SERVICE_ROLE_KEY}});
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const file=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(root.endsWith(sep)?root:root+sep)){res.writeHead(403);res.end();return;}
  if(!(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500,{'Content-Type':'text/plain; charset=utf-8'});res.end(error.code==='ENOENT'?'Arquivo não encontrado.':'Não foi possível atender esta solicitação local.');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'A porta 4173 já está em uso. Feche o outro teste local ou configure LOCAL_PORT.':error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Missão Escola local: http://localhost:${port}\nAbra esse endereço no navegador. Para encerrar, pressione Ctrl+C.\nNenhum deploy é realizado. Amigos e ligas exigem backend configurado; o Tutor exige login e origem autorizada no Supabase.`));
