const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../dist');
const assets={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};

(async()=>{
 const {createPedagogyDB,seedPedagogy,asUser,action}=await import('../pedagogy-db.test.mjs');
 const db=await createPedagogyDB();
 const ids=await seedPedagogy(db);
 for(const name of ['social.sql','migrations/20261126161316_mission_rewards.sql']){
  await db.exec(fs.readFileSync(path.resolve(__dirname,'../../supabase',name),'utf8'));
 }
 await db.query('insert into public.edu_workspace_owners(user_id) values($1)',[ids.admin]);
 const server=http.createServer((req,res)=>{
  const route=req.url.split('?')[0];
  const file=path.join(root,route==='/'?'index.html':route);
  try{
   res.setHeader('Content-Type',assets[path.extname(file)]||'text/html');
   res.end(fs.readFileSync(file));
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 let browser,queue=Promise.resolve(),deferRedeem=false;
 const errors=[];
 const serial=work=>{const next=queue.then(work);queue=next.catch(()=>{});return next;};
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  async function pageFor(user,destination="recompensas"){
   const context=await browser.newContext({reducedMotion:'reduce',locale:'pt-BR',viewport:{width:1280,height:1000}});
   await context.addInitScript(user=>{
    localStorage.setItem('missao-escola-supabase-session',JSON.stringify({
     access_token:'fixture-'+user,refresh_token:'refresh-fixture',expires_at:Date.now()/1000+3600,user:{id:user,email:'fixture@example.test'}
    }));
   },user);
   await context.route('**/*.supabase.co/**',async route=>{
    const req=route.request();
    const url=new URL(req.url());
    const person=req.headers().authorization?.replace('Bearer fixture-','');
    const body=req.postData()?req.postDataJSON():{};
    try{
     if(url.pathname==='/rest/v1/rpc/mission_rewards_action'){
      const value=await serial(()=>asUser(db,person,async()=>{
       const result=await db.query('select public.mission_rewards_action($1,$2,$3) data',[body.p_mode,body.p_op,JSON.stringify(body.p_body)]);
       return result.rows[0].data;
      }));
      if(deferRedeem&&body.p_op==='redeem'){deferRedeem=false;return route.abort();}
      return route.fulfill({json:value});
     }
     if(url.pathname==='/auth/v1/user')return route.fulfill({json:{id:person,email:'fixture@example.test'}});
     if(url.pathname==='/rest/v1/rpc/pedagogy_action')return route.fulfill({json:await serial(()=>action(db,person,body.p_op,body.p_body))});
     if(url.pathname.includes('learner_backups'))return route.fulfill({json:[]});
     return route.fulfill({status:503,json:{message:'Serviço fora deste teste.'}});
    }catch(error){return route.fulfill({status:error.code==='42501'?403:400,json:{code:error.code,message:error.message}});}
   });
   const page=await context.newPage();
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(origin+'/#'+destination);
   await page.locator('#app-splash').waitFor({state:'detached'});
   if(destination==='administracao'){
    await page.locator('#page-administracao').getByRole('button',{name:'Missão Rewards',exact:true}).click();
   }
   await page.getByRole('heading',{name:'Catálogo de benefícios'}).waitFor();
   return page;
  }
  const student=await pageFor(ids.student);
  const currentBalance=()=>student.locator('#mp-program-balance').innerText();
  const demoBalance=()=>student.locator('.mp-demo-balance').innerText();
  assert.equal(await currentBalance(),'0 MP');
  assert.ok(await student.getByText('Nenhum benefício confirmado está disponível neste ambiente.').isVisible());
  assert.equal(await student.getByRole('button',{name:'Administrar programa'}).count(),0);
  await student.getByRole('button',{name:'Demonstração',exact:true}).click();
  await student.getByRole('heading',{name:'Catálogo de benefícios'}).waitFor();
  assert.match(await student.locator('#mp-mode-notice').innerText(),/Pontos fictícios/);
  await student.getByText('Como ganhar MP',{exact:true}).click();
  const fractions=student.locator('.mp-card').filter({has:student.getByRole('heading',{name:'Frações em pequenas partes'})});
  await fractions.getByRole('button',{name:'Começar atividade'}).click();
  const challenge=student.locator('.mp-dialog');
  await challenge.locator('[name=q0][value="0"]').check();
  await challenge.locator('[name=q1][value="2"]').check();
  await challenge.getByRole('button',{name:'Conferir respostas'}).click();
  await challenge.getByText(/Revise a leitura/).waitFor();
  await challenge.locator('[name=q0][value="1"]').check();
  await challenge.getByRole('button',{name:'Conferir respostas'}).click();
  await student.locator('#mp-status').getByText(/Atividade concluída/).waitFor();
  assert.equal(await demoBalance(),'Saldo de teste: 20 MP');
  assert.equal(await currentBalance(),'0 MP');
  const digital=student.locator('.mp-card').filter({has:student.getByRole('heading',{name:'Emblema ilustrativo',exact:true})});
  await digital.getByRole('button',{name:'Solicitar resgate'}).click();
  deferRedeem=true;
  await challenge.getByRole('button',{name:'Confirmar resgate'}).click();
  await challenge.locator('[data-mp-feedback]').getByText(/failed|fetch|conexão/i).waitFor();
  await challenge.getByRole('button',{name:'Confirmar resgate'}).click();
  await student.locator('#mp-status').getByText(/Solicitação registrada/).waitFor();
  assert.equal(await demoBalance(),'Saldo de teste: 0 MP');
  assert.equal(await student.getByRole('button',{name:'Cancelar pedido'}).count(),1);
  await student.getByRole('button',{name:'Cancelar pedido'}).click();
  await student.getByText('Cancelado',{exact:true}).last().waitFor();
  assert.equal(await demoBalance(),'Saldo de teste: 20 MP');
  assert.equal(await currentBalance(),'0 MP');
  await student.getByRole('button',{name:'Programa',exact:true}).click();
  await student.getByRole('heading',{name:'Catálogo de benefícios'}).waitFor();
  assert.equal(await currentBalance(),'0 MP');
  assert.equal(await student.getByText('Emblema ilustrativo',{exact:true}).count(),0);
  const benefitsTab=student.getByRole('tab',{name:'Benefícios em MP'});
  const studioTab=student.getByRole('tab',{name:'Ateliê visual'});
  await benefitsTab.focus();
  await student.keyboard.press('ArrowRight');
  assert.equal(await studioTab.getAttribute('aria-selected'),'true');
  assert.ok(await student.locator('#mission-rewards').isHidden());
  assert.ok(await student.getByRole('tabpanel',{name:'Ateliê visual'}).isVisible());
  assert.ok(await student.locator('#wallet-coins').isVisible());
  await student.keyboard.press('Home');
  assert.equal(await benefitsTab.getAttribute('aria-selected'),'true');
  assert.ok(await student.locator('#reward-studio-section').isHidden());
  await student.getByText('Como ganhar MP',{exact:true}).click();


  const admin=await pageFor(ids.admin,"administracao");
  await admin.getByRole('button',{name:'Administrar programa'}).click();
  await admin.getByRole('heading',{name:'Administração do Missão Rewards'}).waitFor();
  await admin.getByText('Regras de pontuação',{exact:true}).click();
  const rule=admin.locator('[data-mp-form="admin_rule"]');
  await rule.locator('[name=code]').selectOption('recovery');
  assert.equal(await rule.locator('[name=points]').inputValue(),'40');
  await rule.locator('[name=points]').fill('45');
  await rule.getByRole('button',{name:'Salvar'}).click();
  await admin.locator('#mp-status').getByText('Alteração registrada.').waitFor();

  for(const width of [320,390,768,1440]){
   await student.setViewportSize({width,height:900});
   for(const theme of ['dark','light']){
    await student.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),width+' '+theme);
   }
  }
  await student.setViewportSize({width:320,height:844});
  await student.evaluate(()=>document.documentElement.style.fontSize='200%');
  assert.ok(await student.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await student.getByRole('button',{name:'Começar atividade'}).first().focus();
  await student.keyboard.press('Enter');
  await student.locator('.mp-dialog').waitFor();
  assert.ok(await student.locator('.mp-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await student.keyboard.press('Escape');
  assert.deepEqual(errors,[]);
  console.log('PASS browser Mission Rewards: feedback, verified credit, lost-response retry, refund, demo isolation, owner rules, responsiveness and keyboard.');
 }finally{
  await browser?.close();
  server.close();
  await db.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
