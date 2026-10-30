export function mountSocial(container, getToken) {
  let data=null,busy=false;
  const h=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tiers=['Aurora','Celeste','Cristal','Estelar'];
  const button=(op,label,id='')=>`<button class="outline-button" data-social-op="${op}" data-target="${h(id)}">${label}</button>`;
  const people=(rows,actions=()=> '')=>rows.length?rows.map(p=>`<div class="social-row"><div><strong>${h(p.avatar||'✦')} ${h(p.nickname)}</strong></div><div class="social-actions">${actions(p)}</div></div>`).join(''):'<p>Nenhum jogador nesta lista.</p>';
  const board=rows=>`<ol>${rows.map(p=>`<li>${h(p.nickname)} — <strong>${p.points} pontos</strong></li>`).join('')}</ol>`;
  async function api(op,body={}) {
    const r=await fetch('/api/social',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await getToken()}`},body:JSON.stringify({op,...body})});
    const value=await r.json().catch(()=>({error:'A API não está disponível. Confira a publicação no Cloudflare Pages.'}));
    if(!r.ok)throw Error(value.error||'Não foi possível concluir.');return value;
  }
  function render(message='') {
    container.innerHTML=`<h2>Amigos e ligas</h2><p role="status">${h(message)}</p>${!data?button('state','Carregar amigos e ligas'):!data.registered?`<form data-social-form="register" class="social-form"><label>Apelido público<input name="nickname" minlength="2" maxlength="24" required autocomplete="nickname"></label><button class="primary-button">Criar perfil social</button></form><p>Somente apelido, avatar e pontos são compartilhados. Seu e-mail e seus estudos privados não aparecem.</p>`:`<p>Seu código de amizade: <strong class="social-code">${h(data.me.code)}</strong></p><form data-social-form="profile" class="social-form"><label>Apelido<input name="nickname" minlength="2" maxlength="24" value="${h(data.me.nickname)}" required></label><label>Avatar<select name="avatar">${['✦','☾','✿','♜'].map(v=>`<option ${v===data.me.avatar?'selected':''}>${v}</option>`).join('')}</select></label><button class="outline-button">Salvar perfil</button></form><h3>Meus amigos</h3>${people(data.friends,p=>button('remove','Remover',p.id)+button('block','Bloquear',p.id))}<form data-social-form="invite" class="social-form"><label>Código do amigo<input name="code" minlength="12" maxlength="12" required autocomplete="off"></label><button class="primary-button">Enviar convite</button></form><h3>Convites recebidos</h3>${people(data.incoming,p=>button('accept','Aceitar',p.id)+button('decline','Recusar',p.id))}<h3>Convites enviados</h3>${people(data.outgoing,p=>button('decline','Cancelar',p.id))}<h3>Bloqueados</h3>${people(data.blocked,p=>button('unblock','Desbloquear',p.id))}<h3>Ranking entre amigos</h3><p>Semana de ${h(data.week)} · horário de Brasília</p>${board(data.ranking)}<h3>Liga ${h(tiers[data.league?.tier??data.me.tier])}</h3>${data.league?board(data.league.board):button('join','Participar da liga desta semana')}<p>Grupos de até dez jogadores. Com pelo menos quatro participantes, os três primeiros com pontos sobem uma liga na próxima participação. Empates são resolvidos por identificador de jogador.</p><h3>Prática competitiva de matemática</h3>${data.active?`<p>Questão ${data.active.cursor+1} de 3 · sessão válida por 30 minutos.</p><p><strong>${h(data.active.question.question)}</strong></p><div class="choice-list">${data.active.question.answers.map((a,i)=>`<button class="outline-button" data-social-op="answer" data-answer="${i}">${h(a)}</button>`).join('')}</div>`:data.league?button('start','Começar sessão de 3 questões'):'<p>Entre na liga para começar uma sessão.</p>'}<p>10 pontos por acerto, até 20 acertos pontuados por dia. Bônus de 15 pontos por sessão com acerto, até três bônus por dia. Até dez sessões por dia. Pontos são calculados pelo servidor; o progresso local não gera pontos.</p>${button('state','Atualizar amigos e liga')}`}`;
    if(busy)container.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);
  }
  async function execute(op,body={}) {
    if(busy)return;busy=true;render('Conectando…');
    try {
      const response=await api(op,body);let message='Atualizado.';
      if(op==='answer') {
        message=`${response.correct?'Resposta correta!':'Vamos revisar.'} ${response.explanation} +${response.points} pontos.${response.finished?' Sessão concluída.':''}`;
        data=await api('state');
      }else data=response;
      busy=false;render(message);
    }catch(e){busy=false;render(e.message);}
  }
  container.addEventListener('submit',event=>{
    const form=event.target.closest('[data-social-form]');if(!form)return;
    event.preventDefault();event.stopPropagation();execute(form.dataset.socialForm,Object.fromEntries(new FormData(form)));
  });
  container.addEventListener('click',event=>{
    const b=event.target.closest('[data-social-op]');if(!b||busy)return;
    const op=b.dataset.socialOp;
    if(['remove','block'].includes(op)&&!confirm(op==='block'?'Bloquear este jogador e remover a amizade?':'Remover esta amizade?'))return;
    execute(op,op==='answer'?{session:data.active.id,cursor:data.active.cursor,answer:Number(b.dataset.answer)}:{target:b.dataset.target});
  });
  render();
}
