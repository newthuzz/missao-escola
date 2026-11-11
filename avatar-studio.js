import {avatarGroups,avatarModels,avatarPalettes,avatarAccessories,parseAvatar,encodeAvatar} from './avatar-catalog.mjs';
import {avatar} from './social-art.js';
export function avatarStudio(value){
 const selected=parseAvatar(value);
 return `<section class="avatar-studio" aria-labelledby="avatar-studio-title"><div class="studio-heading"><div><span class="section-kicker">24 PERSONAGENS · 6 ILHAS</span><h3 id="avatar-studio-title">Quem vai explorar com você?</h3><p>Escolha um personagem e dê seu toque às cores e aos acessórios.</p></div></div><input type="hidden" name="avatar" value="${encodeAvatar(selected)}"><label class="studio-filter">Explorar coleção<select data-avatar-filter><option value="all">Todas as ilhas · 24 modelos</option>${Object.entries(avatarGroups).map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select></label><fieldset class="studio-models"><legend class="studio-sr-only">Modelo do avatar</legend><div class="studio-gallery">${Object.entries(avatarModels).map(([id,m])=>`<label class="studio-model" data-avatar-group="${m.group}"><input type="radio" name="avatar-model" value="${id}" ${selected.model===id?'checked':''}><span class="studio-model-art">${avatar(id)}</span><strong>${m.name}</strong><small>${avatarGroups[m.group]}</small></label>`).join('')}</div></fieldset><p class="studio-description" aria-live="polite">${avatarModels[selected.model].note}</p><fieldset><legend>Escolha a paleta</legend><div class="studio-palettes">${Object.entries(avatarPalettes).map(([id,p])=>`<label class="studio-palette"><input type="radio" name="avatar-palette" value="${id}" ${selected.palette===id?'checked':''}><span class="studio-swatch swatch-${id}" aria-hidden="true"></span><span>${p.name}</span></label>`).join('')}</div></fieldset><fieldset><legend>Um detalhe de personalidade</legend><div class="studio-accessories">${Object.entries(avatarAccessories).map(([id,name])=>`<label class="studio-accessory"><input type="radio" name="avatar-accessory" value="${id}" ${selected.accessory===id?'checked':''}><span data-accessory-preview="${id}">${avatar(encodeAvatar({...selected,accessory:id}))}</span><span>${name}</span></label>`).join('')}</div></fieldset><small class="studio-availability">Todos os personagens, cores e acessórios estão disponíveis para você.</small></section>`;
}
export function wireAvatarStudio(form){
 const hidden=form.elements.avatar;
 form.querySelector('[data-avatar-filter]').addEventListener('change',event=>{
  const group=event.target.value;
  form.querySelectorAll('[data-avatar-group]').forEach(card=>card.hidden=group!=='all'&&card.dataset.avatarGroup!==group);
 });
 form.addEventListener('input',event=>{
  if(!['avatar-model','avatar-palette','avatar-accessory'].includes(event.target.name))return;
  const selected={model:form.elements['avatar-model'].value,palette:form.elements['avatar-palette'].value,accessory:form.elements['avatar-accessory'].value};
  hidden.value=encodeAvatar(selected);
  form.querySelector('.studio-description').textContent=avatarModels[selected.model].note;
  form.querySelectorAll('[data-accessory-preview]').forEach(el=>el.innerHTML=avatar(encodeAvatar({...selected,accessory:el.dataset.accessoryPreview})));
 });
}
