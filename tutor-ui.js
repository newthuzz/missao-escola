import {getAccountToken,getAccountUser} from './account.js';
import {exerciseVersion,contextKey} from './tutor-context.mjs';
import {URL as SUPABASE_URL,KEY as SUPABASE_KEY} from './cloud-api.mjs';
// Minimal emphasis only: generated HTML is always kept as literal text.
function readableText(parent,text){
  for(const piece of text.split(/(\*\*[^*\n]{1,180}\*\*)/g)){
    if(piece.startsWith('**')&&piece.endsWith('**')&&piece.length>4){
      const strong=document.createElement('strong');strong.textContent=piece.slice(2,-2);parent.append(strong);
    }else parent.append(document.createTextNode(piece));
  }
}
let mathLoading;
async function renderMath(body,text) {
  body.replaceChildren();readableText(body,text);
  if(!/\\[([]|\$\$/.test(text))return;
  if(!mathLoading){
    const css=document.createElement('link');css.rel='stylesheet';css.href='./assets/katex/katex.min.css';document.head.append(css);
    mathLoading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='./assets/katex/katex.min.js';script.onload=resolve;script.onerror=reject;document.head.append(script);}).catch(()=>{mathLoading=null;});
  }
  await mathLoading;if(!window.katex||!body.isConnected)return;
  const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const node of nodes){
    const value=node.data,fragment=document.createDocumentFragment();let end=0;
    const pattern=/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g;
    for(const match of value.matchAll(pattern)){
      fragment.append(document.createTextNode(value.slice(end,match.index)));
      const span=document.createElement('span');
      try{window.katex.render(match[1]??match[2]??match[3],span,{displayMode:match[1]===undefined,throwOnError:false,trust:false,strict:'warn',maxExpand:100,maxSize:20});}
      catch{span.textContent=match[0];}
      fragment.append(span);end=match.index+match[0].length;
    }
    fragment.append(document.createTextNode(value.slice(end)));node.replaceWith(fragment);
  }
}
export function mountTutor(launcher) {
  const panel=document.createElement('section');panel.id='tutor-panel';panel.className='tutor-panel';panel.hidden=true;
  panel.setAttribute('aria-labelledby','tutor-heading');panel.tabIndex=-1;
  panel.innerHTML=`<header class="tutor-header"><div class="tutor-identity"><img class="tutor-mascot" src="./assets/mascot/mascot-thinking.webp" alt="" aria-hidden="true" width="30" height="36" decoding="async"><h2 id="tutor-heading">Tutor IA</h2></div><div class="tutor-header-actions"><button type="button" id="tutor-options" aria-expanded="false" aria-controls="tutor-tools">Conversas</button><button type="button" id="tutor-minimize" aria-label="Minimizar tutor">−</button></div></header>
  <div id="tutor-tools" class="tutor-tools" hidden>
   <div class="tutor-history"><label><span>Histórico</span><select id="tutor-history" aria-label="Histórico do tutor"><option value="">Conversa atual</option></select></label><button type="button" id="tutor-delete" disabled>Apagar</button></div>
   <details class="tutor-privacy-details"><summary>Sobre suas mensagens</summary><p class="tutor-privacy">Mensagens são enviadas ao provedor de IA e salvas na sua conta no Supabase. Evite dados pessoais. A IA pode errar.</p></details>
  </div>
  <section id="tutor-access" class="tutor-access" aria-labelledby="tutor-access-title"><h3 id="tutor-access-title">Entre para conversar com o Tutor</h3><p id="tutor-access-note">Sua conta permite conversar e guardar o histórico. O perfil escolar escolhe os conteúdos; ele não substitui o login.</p><button class="primary-button" type="button" id="tutor-login">Entrar ou criar conta</button><button class="outline-button" type="button" id="tutor-load-retry" hidden>Carregar novamente</button></section>
  <div class="tutor-context" id="tutor-context"></div>
  <button type="button" class="text-button tutor-load-older" id="tutor-older" hidden>Ver mensagens anteriores</button>
  <div class="tutor-messages" id="tutor-messages" role="log" aria-live="off" aria-label="Mensagens do tutor"></div>
  <p class="tutor-status" id="tutor-status" role="status" aria-live="polite"></p>
  <form class="tutor-form" id="tutor-form">
   <div class="tutor-compose-row"><label class="tutor-sr-only" for="tutor-message">Sua mensagem</label><textarea id="tutor-message" rows="1" maxlength="3500" placeholder="Escreva sua dúvida…"></textarea><button class="primary-button" type="submit" id="tutor-send" title="Enviar mensagem"><span class="tutor-sr-only">Enviar</span><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="m6 11 6-6 6 6M12 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
   <div class="tutor-actions"><button type="button" class="text-button" id="tutor-extra-toggle" aria-expanded="false" aria-controls="tutor-extra">Mais opções</button><button class="outline-button" type="button" id="tutor-retry" hidden>Tentar novamente</button></div>
   <div class="tutor-extra" id="tutor-extra" hidden><div class="tutor-suggestions" aria-label="Sugestões opcionais"><button type="button" data-tutor-suggestion="Explique de outro jeito, com um exemplo.">Outro exemplo</button><button type="button" data-tutor-suggestion="Quero uma dica conceitual para começar.">Uma dica</button><button type="button" data-tutor-suggestion="Explique com mais detalhes a sua última resposta, em passos curtos.">Mais detalhes</button></div><details><summary>Adicionar minha tentativa</summary><label for="tutor-answer">Texto para o tutor analisar<textarea class="tutor-answer" id="tutor-answer" maxlength="2500" rows="2" placeholder="Cole sua resposta ou explique até onde chegou."></textarea></label></details></div>
  </form>`;
  document.body.append(panel);
  const $=id=>panel.querySelector('#'+id),log=$('tutor-messages'),field=$('tutor-message'),answerField=$('tutor-answer');
  let user=getAccountUser(),descriptor=read(),signature=contextKey(descriptor.context),epoch=0,sendController,loadController;
  let conversationId=null,viewingHistory=false,busy=false,lastFailed=null,pendingNode=null,threads=[],earliestSeq=null,ready=false;
  function read(){const value=window.TutorStudy.snapshot(),q=value.question;return {...value,context:{exerciseId:q?.id||null,version:q?exerciseVersion(q):null,mode:value.mode}};}
  function status(text,error=false,quiet=false){$('tutor-status').textContent=text;$('tutor-status').dataset.error=String(error);$('tutor-status').dataset.quiet=String(quiet&&!error);}
  function controls(){
   const allowed=Boolean(user&&ready&&!viewingHistory);field.disabled=!allowed;answerField.disabled=!allowed;$('tutor-send').disabled=busy||!allowed;
   $('tutor-form').hidden=!allowed;$('tutor-access').hidden=Boolean(user&&ready);$('tutor-options').hidden=!user;log.hidden=!user;
   $('tutor-login').hidden=Boolean(user);$('tutor-load-retry').hidden=!user;
   $('tutor-access-title').textContent=user?'A conversa ainda não está pronta':'Entre para conversar com o Tutor';
   $('tutor-access-note').textContent=user?'Aguarde o carregamento. Se não conectar, tente novamente. Seu estudo continua disponível.':'Sua conta permite conversar e guardar o histórico. O perfil escolar escolhe os conteúdos; ele não substitui o login.';
   $('tutor-delete').disabled=!conversationId||busy;
  }
  function contextLabel(saved){
    const title=document.createElement('strong');title.textContent=viewingHistory?'Histórico · '+(saved?.title||'Conversa anterior'):descriptor.question?.question||'Conversa de estudo';
    const note=document.createElement('small');note.textContent=viewingHistory?'Somente leitura. Selecione “Conversa atual” para continuar.':(saved?.mode||descriptor.mode)==='diagnostic'?'Teste inicial · ajuda conceitual, sem gabarito.':'Pergunte sobre esta atividade ou outro assunto de estudo.';
    const diagnostic=(saved?.mode||descriptor.mode)==='diagnostic';
    $('tutor-context').hidden=!viewingHistory&&!descriptor.question&&!diagnostic;
    $('tutor-context').replaceChildren(title,...(viewingHistory||diagnostic?[note]:[]));
  }
  function listThreads(){
    const select=$('tutor-history'),selected=select.value;select.replaceChildren(new Option('Conversa atual',''));
    for(const thread of threads){if(thread.id===conversationId&&!viewingHistory)continue;select.append(new Option((thread.title||'Conversa de estudo')+' · '+new Date(thread.updated_at).toLocaleDateString('pt-BR'),thread.id));}
    select.value=viewingHistory?selected:'';
  }
  function bubble(role,text){
    log.querySelector('.tutor-empty')?.remove();
    const article=document.createElement('article');article.className='tutor-message';article.dataset.role=role;
    article.setAttribute('aria-label',role==='user'?'Sua mensagem':'Resposta do tutor');
    const label=document.createElement('strong');label.textContent=role==='user'?'Você':'Tutor IA';
    const body=document.createElement('div');body.className='tutor-message-body';body.textContent=text;
    article.append(label,body);log.append(article);
    return {article,body};
  }
  function showMessages(messages){
    log.replaceChildren();
    if(!messages.length){const p=document.createElement('p');p.className='tutor-empty';p.textContent='Qual é a sua dúvida? Se for uma atividade de fora do site, inclua o enunciado.';log.append(p);}
    for(const m of messages){const node=bubble(m.role,m.content);if(m.role==='assistant')renderMath(node.body,m.content);}
    log.scrollTop=log.scrollHeight;
  }
  function cancel(){epoch++;sendController?.abort();loadController?.abort();busy=false;ready=false;pendingNode=null;lastFailed=null;$('tutor-retry').hidden=true;$('tutor-older').hidden=true;}
  async function post(payload,signal){
    const expected=user,token=await getAccountToken();
    if(!expected||getAccountUser()!==expected)throw Error('A conta mudou. Entre novamente.');
    const response=await fetch(SUPABASE_URL+'/functions/v1/quick-endpoint',{method:'POST',cache:'no-store',signal,headers:{'Content-Type':'application/json',apikey:SUPABASE_KEY,Authorization:'Bearer '+token},body:JSON.stringify(payload)});
    if(getAccountUser()!==expected)throw new DOMException('Account changed','AbortError');
    if(!response.ok){const data=await response.json().catch(()=>null);throw Error(data?.error||'Não foi possível conectar ao tutor.');}
    return response;
  }
  async function load(historyId=null){
    loadController?.abort();loadController=new AbortController();const activeController=loadController,ticket=++epoch;
    const timer=setTimeout(()=>activeController.abort(),25000);
    conversationId=null;ready=false;controls();contextLabel();
    if(!user){clearTimeout(timer);showMessages([]);status('Entre na sua conta para conversar e guardar seu histórico.');return;}
    status('Carregando conversa…');
    try{
      const response=await post({op:'state',context:descriptor.context,...(historyId?{conversationId:historyId}:{})},loadController.signal),data=await response.json();
      if(ticket!==epoch)return;
      if(data.protocol!==2||!Array.isArray(data.messages))throw Error('O tutor ainda não está disponível. Tente novamente mais tarde.');
      ready=data.available!==false;
      conversationId=data.conversation?.id||null;threads=data.conversations||[];showMessages(data.messages||[]);contextLabel(data.context||data.conversation?.context);listThreads();controls();
      earliestSeq=data.messages?.[0]?.seq||null;$('tutor-older').hidden=!data.hasMore;$('tutor-older').disabled=false;
      $('tutor-retry').hidden=ready;
      status(data.available===false?'O tutor está indisponível no momento. Você pode tentar novamente mais tarde.':viewingHistory?'Você está consultando uma conversa anterior.':'Você pode perguntar sem escolher uma sugestão.',data.available===false,data.available!==false);
    }catch(error){if(ticket!==epoch)return;status(error.name==='AbortError'?'A conexão demorou. Tente carregar a conversa novamente.':error.message==='Mensagem inválida'?'O tutor ainda não está disponível. Tente novamente mais tarde.':error.message,true);$('tutor-retry').hidden=false;controls();}
    finally{clearTimeout(timer);}
  }
  async function send(payload,retry=false){
    if(busy||viewingHistory||!ready)return;
    if(!user){status('Entre na sua conta para enviar sua pergunta.');return;}
    const ticket=++epoch;loadController?.abort();sendController=new AbortController();busy=true;lastFailed=null;$('tutor-retry').hidden=true;controls();
    const activeController=sendController,timer=setTimeout(()=>activeController.abort(),105000);
    if(!retry)bubble('user',payload.message+(payload.answer?'\n\nMinha resposta: '+payload.answer:''));
    pendingNode?.article.remove();pendingNode=bubble('assistant','');pendingNode.article.dataset.incomplete='true';
    const node=pendingNode,output=document.createTextNode('');node.body.replaceChildren(output);
    let complete=false;
    const event=(name,data)=>{
      if(ticket!==epoch)return;
      if(name==='start'||name==='done'){
        if(data.requestId!==payload.requestId||(data.context?.exerciseId||null)!==(payload.context.exerciseId||null)||(data.context?.version||null)!==(payload.context.version||null))throw Error('A resposta pertence a outro contexto. Tente novamente.');
      }
      if(name==='error')throw Error(data.error||'A resposta foi interrompida.');
      if(name==='start'){conversationId=data.conversationId;contextLabel(data.context);}
      if(name==='delta'){const follow=log.scrollHeight-log.scrollTop-log.clientHeight<80;output.appendData(data.text);if(follow)log.scrollTop=log.scrollHeight;}
      if(name==='done'){
        complete=true;conversationId=data.conversationId;output.data=data.text;delete node.article.dataset.incomplete;renderMath(node.body,data.text);
        if(data.checks?.length){const checked=document.createElement('small');checked.className='tutor-checks';checked.textContent='Calculadora: '+data.checks.map(c=>c.expression+' = '+c.result).join('; ')+'. Apenas estas operações foram conferidas.';node.article.append(checked);}
        status('Resposta disponível. Você pode continuar a conversa.',false,true);
      }
    };
    try{
      window.TutorStudy.markHelped(payload.context.exerciseId);status('O tutor está preparando uma explicação…');
      const response=await post({op:'send',...payload},sendController.signal);
      if(ticket!==epoch){await response.body?.cancel();return;}
      if(response.headers.get('Content-Type')?.includes('application/json')){event('done',await response.json());}
      else{
        const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
        const consume=block=>{let name='message';const data=[];for(const line of block.split('\n')){if(line.startsWith('event:'))name=line.slice(6).trim();else if(line.startsWith('data:'))data.push(line.slice(5).trimStart());}if(data.length)event(name,JSON.parse(data.join('\n')));};
        try{for(;;){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true}).replace(/\r/g,'');const blocks=buffer.split('\n\n');buffer=blocks.pop();for(const block of blocks)consume(block);}buffer+=decoder.decode();if(buffer.trim())consume(buffer);}
        finally{await reader.cancel().catch(()=>{});}
      }
      if(ticket===epoch&&!complete)throw Error('A conexão foi interrompida antes de concluir. Tente novamente.');
    }catch(error){
      if(ticket!==epoch)return;
      lastFailed=payload;$('tutor-retry').hidden=false;
      node.article.querySelector('strong').textContent='Resposta não concluída';
      status(error.name==='AbortError'?'A conexão demorou. Tente enviar novamente.':error.message,true);
    }finally{clearTimeout(timer);if(ticket===epoch){busy=false;controls();if(complete)pendingNode=null;}}
  }
  panel.addEventListener('submit',event=>{
    event.preventDefault();const message=field.value.trim();if(!message||busy||viewingHistory||!ready)return;
    if(!user){status('Entre na sua conta para enviar sua pergunta.');return;}
    const payload={message,answer:answerField.value.trim()||window.TutorStudy.snapshot().studentAnswer||'',requestId:crypto.randomUUID(),context:descriptor.context};
    field.value='';fitMessage();send(payload);
  });
  function fitMessage(){field.style.height='auto';field.style.height=Math.min(96,field.scrollHeight+2)+'px';}
  field.addEventListener('input',fitMessage);
  field.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('tutor-form').requestSubmit();}});
  panel.addEventListener('click',event=>{
    const suggestion=event.target.closest('[data-tutor-suggestion]');if(suggestion){field.value=suggestion.dataset.tutorSuggestion;$('tutor-extra').hidden=true;$('tutor-extra-toggle').setAttribute('aria-expanded','false');field.focus();fitMessage();}
    for(const [button,target] of [['tutor-options','tutor-tools'],['tutor-extra-toggle','tutor-extra']]){if(event.target.closest('#'+button)){const region=$(target);region.hidden=!region.hidden;$(button).setAttribute('aria-expanded',String(!region.hidden));}}
    if(event.target.closest('#tutor-minimize'))toggle(false);
    if(event.target.closest('#tutor-login')){const context=window.TutorStudy.snapshot();try{sessionStorage.setItem('missao-tutor-return',JSON.stringify({page:window.TutorStudy.returnContext?.().page||'aprendizagem',questionId:context.question?.id||null}));}catch{}toggle(false);window.navigate('social');}
    if(event.target.closest('#tutor-load-retry'))load();
    if(event.target.closest('#tutor-retry')){if(lastFailed)send(lastFailed,true);else load(viewingHistory?$('tutor-history').value:null);}
    if(event.target.closest('#tutor-older')&&conversationId&&earliestSeq){
      const ticket=epoch,control=$('tutor-older'),before=earliestSeq,id=conversationId;control.disabled=true;
      loadController?.abort();loadController=new AbortController();
      post({op:'state',conversationId:id,beforeSeq:before},loadController.signal).then(response=>response.json()).then(data=>{
        if(ticket!==epoch)return;
        const height=log.scrollHeight,fragment=document.createDocumentFragment();
        for(const m of data.messages||[]){const node=bubble(m.role,m.content);fragment.append(node.article);if(m.role==='assistant')renderMath(node.body,m.content);}
        log.prepend(fragment);log.scrollTop+=log.scrollHeight-height;earliestSeq=data.messages?.[0]?.seq||earliestSeq;control.hidden=!data.hasMore;
      }).catch(error=>{if(ticket===epoch&&error.name!=='AbortError')status(error.message,true);}).finally(()=>{if(ticket===epoch)control.disabled=false;});
    }
    if(event.target.closest('#tutor-delete')&&conversationId&&!busy&&confirm('Apagar esta conversa e suas mensagens?')){
      const id=conversationId;cancel();const ticket=epoch;
      post({op:'delete',conversationId:id}).then(()=>{if(ticket!==epoch)return;viewingHistory=false;$('tutor-history').value='';load();}).catch(error=>{if(ticket===epoch)status(error.message,true);});
    }
  });
  $('tutor-history').addEventListener('change',()=>{const id=$('tutor-history').value;$('tutor-tools').hidden=true;$('tutor-options').setAttribute('aria-expanded','false');cancel();viewingHistory=Boolean(id);showMessages([]);load(id||null);});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();toggle(false);}});
  window.addEventListener('missao-study-context',()=>{
    const next=read(),key=contextKey(next.context);descriptor=next;
    if(key===signature)return;signature=key;cancel();viewingHistory=false;conversationId=null;field.value='';answerField.value='';fitMessage();showMessages([]);contextLabel();controls();if(!panel.hidden)load();
  });
  window.addEventListener('missao-account-change',()=>{
    const next=getAccountUser();if(next===user)return;cancel();user=next;viewingHistory=false;conversationId=null;threads=[];field.value='';answerField.value='';fitMessage();showMessages([]);listThreads();controls();if(!panel.hidden)load();
  });
  function toggle(force){
    const open=force??panel.hidden;panel.hidden=!open;launcher.setAttribute('aria-expanded',String(open));launcher.setAttribute('aria-label',open?'Minimizar Tutor IA':'Abrir Tutor IA');
    if(open){descriptor=read();signature=contextKey(descriptor.context);if((!conversationId||!ready)&&!busy)load();if(matchMedia('(pointer: coarse)').matches)panel.focus({preventScroll:true});else if(user&&ready)field.focus();else panel.focus({preventScroll:true});}else launcher.focus();
  }
  window.addEventListener('missao-account-ready',()=>{let saved;try{saved=JSON.parse(sessionStorage.getItem('missao-tutor-return'));sessionStorage.removeItem('missao-tutor-return');}catch{}if(!saved||!getAccountUser())return;window.navigate(saved.page||'aprendizagem');window.TutorStudy.restoreContext?.(saved);toggle(true);});
  contextLabel();controls();showMessages([]);
  return {toggle};
}
