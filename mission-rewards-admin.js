import {categories, escape, points, rewardStatus, ruleNames, time} from './mission-rewards.js';

const forms = {
 admin_rule:'Regras de pontuação',
 admin_partner:'Parceiros',
 admin_item:'Catálogo e estoque',
 admin_campaign:'Campanhas',
 admin_verify:'Validar participação escolar',
 admin_adjust:'Ajuste de saldo'
};
const transitions = {
 requested:['pending','refused','cancelled'],pending:['approved','refused','cancelled'],
 approved:['preparing','cancelled'],preparing:['delivered','cancelled']
};
const images = {school:'Material escolar',study:'Livro ou estudo',rewards:'Presente',routine:'Calendário',opportunities:'Oportunidades'};

function field(label,name,{type='text',required=true,min,max,maxlength,value='',placeholder=''}={}) {
 return `<label>${label}<input name="${name}" type="${type}" ${required?'required':''} ${min!==undefined?'min="'+min+'"':''}
  ${max!==undefined?'max="'+max+'"':''} ${maxlength?'maxlength="'+maxlength+'"':''} value="${escape(value)}" placeholder="${escape(placeholder)}"></label>`;
}
const text = (label,name,maxlength=500,required=true)=>`<label>${label}<textarea name="${name}" rows="3" maxlength="${maxlength}" ${required?'required':''}></textarea></label>`;
const check = (label,name)=>`<label class="mp-checkbox"><input type="checkbox" name="${name}"> ${label}</label>`;
const select = (label,name,options)=>`<label>${label}<select name="${name}">${options.map(([key,value])=>'<option value="'+escape(key)+'">'+escape(value)+'</option>').join('')}</select></label>`;
const entries = array=>array.map(item=>[item.code,item.name||item.title||ruleNames[item.kind]]);
function edit(op, rows, fields) {
 const choose=rows.length?select('Editar existente','editor',[['','Novo registro'],...entries(rows)]):'';
 return `<details class="mp-information"><summary>${forms[op]}</summary><form data-mp-form="${op}">${choose}${fields}
 <button class="primary-button">Salvar</button></form></details>`;
}
const user = () => field('Identificador do estudante','user_id',{maxlength:36,placeholder:'UUID da conta do estudante'});
const code = () => field('Identificador (letras minúsculas, números e hífens)','code',{maxlength:51});
const reason = () => text('Justificativa ou referência institucional','reason');

function renderQueue(items) {
 const rows=items.slice(0,50);
 return rows.length?rows.map(item=>{
  const options=(transitions[item.status]||[]).map(value=>[value,rewardStatus[value]]);
  return `<article class="mp-card"><h4>${escape(item.item_title)}</h4>
  <p>${rewardStatus[item.status]} · ${points(item.cost)} · ${time(item.created_at)}</p>
  <p>Estudante <code>${escape(item.user_id)}</code></p>
  ${options.length?`<form data-mp-form="admin_status" data-code="${escape(item.id)}">${select('Próximo status','status',options)}
  ${reason()}<button class="outline-button">Registrar andamento</button></form>`:''}</article>`;
 }).join(''):'<p>Nenhum resgate nesta página.</p>';
}
const auditLabels={request:'Solicitação',cancel:'Cancelamento',demo_advance:'Simulação de andamento',admin_status:'Atualização de resgate',
 admin_item:'Edição de catálogo',admin_rule:'Edição de regra',admin_campaign:'Edição de campanha',admin_verify:'Participação validada',
 admin_adjust:'Ajuste de saldo',admin_partner:'Edição de parceiro'};

export function renderRewardsAdmin(data,rules,mode,offset) {
 const schools=[['','Todas as escolas'],...data.schools.map(item=>[item.id,item.name])];
 const partners=[['','Selecione uma instituição'],...entries(data.partners)];
 return `<section class="mp-panel mp-admin"><h2>Administração do Missão Rewards</h2>
 <p>${mode==='demo'?'Ambiente demonstrativo. As alterações afetam apenas a simulação.':'Cadastre benefícios somente com disponibilidade confirmada.'}</p>
 <p>Diferenças a conferir: ${data.walletInconsistencies} em carteiras · ${data.stockInconsistencies} em estoque.</p>
 ${edit('admin_rule',[],select('Regra','code',[['','Selecione'],...Object.entries(ruleNames)])+
  field('Pontos','points',{type:'number',min:1,max:10000})+field('Limite de créditos por dia','daily_limit',{type:'number',min:1,max:50})+
  field('Mínimo de atividades para a meta personalizada','goal_min',{type:'number',min:1,max:10,required:false})+check('Regra ativa','active'))}
 ${edit('admin_partner',data.partners,code()+field('Nome','name',{maxlength:120})+text('Sobre a instituição','summary')+
  check('Disponibilidade confirmada pela instituição','confirmed')+check('Publicar instituição','active'))}
 ${edit('admin_item',data.catalog,code()+field('Nome','title',{maxlength:120})+
  text('Descrição','description')+select('Categoria','category',Object.entries(categories))+select('Ilustração','image',Object.entries(images))+
  field('Custo em MP','cost',{type:'number',min:1,max:1000000})+field('Total de unidades, incluindo as já reservadas e entregues','stock',{type:'number',min:0,max:1000000})+
  select('Instituição responsável','partner_code',partners)+select('Vínculo escolar exigido','school_id',schools)+
  text('Condições de entrega','conditions')+text('Registro privado da confirmação, sem dados pessoais','confirmation',500,false)+
  check('Benefício complementar. A assistência essencial permanece acessível sem pontos.','supplemental')+check('Publicar benefício','active'))}
 ${edit('admin_campaign',data.campaigns,code()+field('Título','title',{maxlength:120})+text('Orientações','instructions',800)+
  select('Tipo','kind',Object.entries(ruleNames).filter(([id])=>id!=='goal'))+select('Escola','school_id',schools)+
  field('Início','starts_at',{type:'datetime-local',required:false})+field('Fim','ends_at',{type:'datetime-local',required:false})+
  '<p>Para atividades, informe de 2 a 10 perguntas no formato abaixo. Numere a alternativa correta a partir de zero. Projetos escolares usam validação administrativa.</p>'+
  text('Perguntas em JSON · [{"prompt":"Enunciado","options":["Opção A","Opção B"],"answer":0}]','questions',40000,false)+check('Campanha ativa','active'))}
 ${edit('admin_verify',[],select('Projeto','code',[['','Selecione'],...entries(data.campaigns.filter(item=>item.kind==='project'&&item.active))])+user()+reason())}
 ${edit('admin_adjust',[],user()+field('Quantidade de MP (positiva ou negativa)','delta',{type:'number',min:-1000000,max:1000000})+reason())}
 <details class="mp-information"><summary>Solicitações e entregas</summary>${renderQueue(data.queue)}</details>
 <details class="mp-information"><summary>Movimentações</summary>${data.movements.length?'<ul class="mp-history">'+data.movements.slice(0,50).map(item=>`<li><div><strong>${escape(item.description)}</strong><small>${time(item.created_at)} · ${escape(item.user_id)}</small></div><strong>${points(item.delta)}</strong></li>`).join('')+'</ul>':'<p>Sem movimentações nesta página.</p>'}</details>
 <details class="mp-information"><summary>Auditoria</summary>${data.audit.length?'<ul class="mp-audit">'+data.audit.slice(0,50).map(item=>`<li><strong>${auditLabels[item.action]||escape(item.action)}</strong><p>${time(item.created_at)} · ${escape(item.actor||'Conta removida')}</p><code>${escape(item.entity)}</code><pre>${escape(JSON.stringify(item.details,null,2))}</pre></li>`).join('')+'</ul>':'<p>Sem registros nesta página.</p>'}</details>
 <div class="mp-controls">${offset?'<button type="button" class="outline-button" data-mp-action="admin_previous">Página anterior</button>':''}
 ${[data.queue,data.audit,data.movements].some(rows=>rows.length>50)?'<button type="button" class="outline-button" data-mp-action="admin_next">Mais registros</button>':''}</div>
 </section>`;
}

function localDate(value) {
 if(!value)return '';
 const datetime=new Date(value);
 return new Date(datetime.getTime()-datetime.getTimezoneOffset()*60000).toISOString().slice(0,16);
}

export function populateAdminForm(form,selected,data,rules) {
 const op=form.dataset.mpForm;
 const lists={admin_item:data.catalog,admin_partner:data.partners,admin_campaign:data.campaigns,admin_rule:rules};
 const row=lists[op]?.find(item=>(item.code||item.kind)===selected);
 for(const control of form.elements){
  if(!control.name||control.name==='editor'||(op==='admin_rule'&&control.name==='code'))continue;
  const value=row?.[control.name];
  if(control.type==='checkbox')control.checked=Boolean(value);
  else if(control.type==='datetime-local')control.value=localDate(value);
  else if(control.name==='questions')control.value=value?.length?JSON.stringify(value,null,2):'';
  else if(control.tagName==='SELECT'&&value==null)control.selectedIndex=0;
  else control.value=value??'';
 }
 if(form.elements.editor&&form.elements.code)form.elements.code.readOnly=Boolean(row);
}

const adjustmentKeys=new WeakMap();
export function readAdminForm(form,fields) {
 const op=form.dataset.mpForm;
 const body=Object.fromEntries(fields);
 delete body.editor;
 for(const key of ['active','confirmed','supplemental'])if(form.elements[key])body[key]=fields.has(key);
 if(body.goal_min==='')delete body.goal_min;
 if(op==='admin_status')body.id=form.dataset.code;
 if(op==='admin_adjust'){
  if(!adjustmentKeys.has(form))adjustmentKeys.set(form,crypto.randomUUID());
  body.request_key=adjustmentKeys.get(form);
 }
 if(op==='admin_campaign'){
  try{body.questions=body.kind==='project'?[]:JSON.parse(body.questions);}
  catch{throw Error('Confira o formato JSON das perguntas.');}
  for(const key of ['starts_at','ends_at'])if(body[key])body[key]=new Date(body[key]).toISOString();
 }
 return body;
}
