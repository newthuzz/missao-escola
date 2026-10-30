import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('generated single-file function registers Deno.serve and preserves auth without external imports',async()=>{
 const previous=globalThis.Deno;let serve;
 const env={TUTOR_ALLOWED_ORIGINS:'https://school.example'};
 globalThis.Deno={serve:handler=>{serve=handler;},env:{get:name=>env[name]}};
 try{
  const path=new URL('../supabase/functions/quick-endpoint/index.ts',import.meta.url);
  const source=fs.readFileSync(path,'utf8');assert.ok(!/^import\s/m.test(source));assert.ok(source.includes('gpt-5-mini'));
  await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));assert.equal(typeof serve,'function');
  const response=await serve(new Request('https://project.supabase.co/functions/v1/quick-endpoint',{method:'POST',headers:{Origin:'https://school.example'},body:'{}'}));
  assert.equal(response.status,401);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://school.example');
  assert.ok(!fs.existsSync(new URL('../dist/server/tutor-catalog.json',import.meta.url)));
 }finally{if(previous===undefined)delete globalThis.Deno;else globalThis.Deno=previous;}
});
