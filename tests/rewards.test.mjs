import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {rewardCharacters,resolveRewardLook,renderLook,rewardArt} from '../reward-look.js';
const ctx=vm.createContext({}),html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');vm.runInContext([...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const ISLAND_XP =')),ctx);const J=ctx.Journey,day='2026-11-11';
const fund=(amount=1000)=>{const s=J.blank();J.award(s,{id:'earned',date:day,xp:100,coins:amount,label:'Local test',kind:'questao'});return s;};
test('catalog is unique and purchases debit only stars, once per permanent item',()=>{
 assert.equal(J.rewards.length,18);assert.equal(new Set(J.rewards.map(i=>i.id)).size,18);
 for(const item of J.rewards){const s=fund(),before=J.xp(s);assert.equal(J.buy(s,item.id,day),null);assert.equal(J.coins(s),1000-item.cost);assert.equal(J.xp(s),before);if(item.type!=='consumable'){assert.ok(J.buy(s,item.id,day));assert.equal(s.purchases.length,1);assert.equal(J.coins(s),1000-item.cost);}}
 const empty=J.blank();assert.ok(J.buy(empty,'lanterna',day));assert.equal(empty.purchases.length,0);assert.ok(J.buy(empty,'unknown',day));
});
test('legacy purchases keep their cost, equipment and aura; current collection round-trips in backups',()=>{
 const legacy={version:3,events:[{id:'legacy',date:day,xp:125,coins:500,label:'Local test',kind:'questao'}],purchases:[{item:'cometa',cost:100,date:day},{item:'astronauta',cost:180,date:day},{item:'violeta',cost:120,date:day}],equipped:'astronauta',aura:true};
 const restored=J.load(legacy);assert.equal(J.coins(restored),100);assert.equal(restored.equipped,'astronauta');assert.equal(restored.rewardLook.effect,'violeta');assert.equal(restored.purchases.length,3);
 const s=fund(10000);for(const item of J.rewards)assert.equal(J.buy(s,item.id,day),null);s.rewardGoal='cometa';const copy=J.load(JSON.parse(JSON.stringify(s)));assert.equal(copy.purchases.length,18);assert.equal(copy.rewardLook.accessory,'asas');assert.equal(copy.rewardLook.effect,'solar');assert.equal(copy.equipped,'baleia-celeste');assert.equal(copy.rewardLook.source,'collection');assert.equal(copy.rewardGoal,'cometa');assert.equal(J.coins(copy),J.coins(s));
});
test('equipment requires ownership, removal is free and the daily chest is idempotent',()=>{
 const s=fund();assert.ok(J.equipReward(s,'asas'));assert.equal(s.rewardLook.accessory,null);J.buy(s,'lanterna',day);assert.equal(s.rewardLook.accessory,'lanterna');J.equipReward(s,'none-accessory');assert.equal(s.rewardLook.accessory,null);J.buy(s,'solar',day);assert.equal(s.aura,false);J.equipReward(s,'none-effect');assert.equal(s.rewardLook.effect,null);J.equipReward(s,'profile');assert.equal(s.rewardLook.source,'profile');
 J.buy(s,'freeze',day);J.buy(s,'freeze',day);const balance=J.coins(s);assert.ok(J.buy(s,'freeze',day));assert.equal(J.coins(s),balance);assert.equal(s.freezes,2);
 assert.equal(J.checkin(s,day),true);assert.equal(J.checkin(s,day),false);assert.equal(J.coins(s),balance+10);
 const invalid=J.load({...s,rewardLook:{source:'bad',accessory:'asas',effect:'violeta'},equipped:'dragao-eclipse'});assert.equal(invalid.rewardLook.accessory,null);assert.equal(invalid.rewardLook.effect,null);assert.equal(invalid.equipped,'padrao');
});
test('every reward renders in a portrait and on the island; unowned overrides are rejected',()=>{
 for(const item of J.rewards){const art=rewardArt(item);assert.ok(art.includes('<svg'));assert.ok(!/undefined|NaN|<script/.test(art));const p=fund();J.buy(p,item.id,day);const look=resolveRewardLook(p,'axolotl~mint~crown');const figure=renderLook(look,{figure:true});assert.ok(figure.includes('0 0 200 360'));assert.ok(!/undefined|NaN/.test(figure));}
 assert.equal(Object.keys(rewardCharacters).length,9);
 const forged=resolveRewardLook({equipped:'dragao-eclipse',rewardLook:{source:'collection',accessory:'asas',effect:'solar'},purchases:[]},'fox');assert.equal(forged.special,null);assert.equal(forged.accessory,null);assert.equal(forged.effect,null);
});

test('live previews expose full figures, independent effects and animation hooks without circular crops',()=>{
 for(const effect of ['violeta','folhas','solar']){const preview=renderLook({base:'astronaut',special:null,accessory:'asas',effect},{figure:true,animated:true,stage:true});assert.ok(preview.includes('viewBox="0 0 200 360"'));assert.ok(preview.includes('data-animated="true"'));assert.ok(preview.includes('data-full-body="true"'));assert.ok(preview.includes('reward-character-life'));assert.ok(preview.includes('reward-arm-left'));assert.ok(preview.includes('reward-effect-'+effect));assert.ok(!preview.includes('<clipPath'));}
 const whale=renderLook({base:'starwhale',special:null,accessory:null,effect:null},{figure:true,animated:true});assert.ok(whale.includes('data-idle="float"'));assert.ok(!whale.includes('reward-arm-left'));
});


test('articulated bodies preserve every model, palette, head accessory and reward attachment',async()=>{
 const {avatarModels,avatarPalettes,avatarAccessories}=await import('../avatar-catalog.mjs');
 for(const model of Object.keys(avatarModels))for(const palette of Object.keys(avatarPalettes))for(const accessory of Object.keys(avatarAccessories))for(const gear of [null,'lanterna','livro','luneta','mochila','asas']){
  const svg=renderLook({base:[model,palette,accessory].join('~'),special:null,accessory:gear,effect:'solar'},{figure:true,animated:true,stage:true});
  assert.ok(!/undefined|NaN|<clipPath/.test(svg));assert.match(svg,/preserveAspectRatio="xMidYMid meet"/);
  if(!['jellyfish','comet','moth','starwhale'].includes(model)){
   for(const joint of ['neck','chest','pelvis','shoulder-left','elbow-right','wrist-left','hip-right','knee-left','ankle-right'])assert.ok(svg.includes('data-joint="'+joint+'"'));
   if(['lanterna','livro','luneta'].includes(gear))assert.ok(svg.includes('data-attachment="left-hand"'));
  }
 }
});
