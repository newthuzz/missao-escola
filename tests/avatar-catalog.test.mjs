import {test} from 'node:test';
import assert from 'node:assert/strict';
import {avatarModels,avatarGroups,avatarPalettes,avatarAccessories,encodeAvatar,parseAvatar,validAvatar} from '../avatar-catalog.mjs';
import {avatar} from '../social-art.js';
test('every avatar combination is valid, round-trips and has self-contained vector references',()=>{
 assert.equal(Object.keys(avatarModels).length,24);
 for(const group of Object.keys(avatarGroups))assert.equal(Object.values(avatarModels).filter(m=>m.group===group).length,4);
 const allIds=new Set();
 for(const model of Object.keys(avatarModels))for(const palette of Object.keys(avatarPalettes))for(const accessory of Object.keys(avatarAccessories)){
  const selected={model,palette,accessory},value=encodeAvatar(selected),svg=avatar(value);
  assert.ok(validAvatar(value));assert.deepEqual(parseAvatar(value),selected);
  assert.ok(!/undefined|NaN|(?:href|src)="https?:|<script/.test(svg));
  const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  for(const id of ids){assert.ok(!allIds.has(id));allIds.add(id);}
  for(const [,id]of svg.matchAll(/url\(#([^)]+)\)/g))assert.ok(ids.includes(id));
 }
});
test('legacy choices remain valid and hostile values use safe artwork',()=>{
 for(const value of ['✦','☾','✿','♜','fox','astronaut'])assert.ok(validAvatar(value));
 for(const value of ['__proto__','constructor','fox~mint','fox~mint~nope','<img src=x>',null,{}]){assert.equal(validAvatar(value),false);assert.equal(parseAvatar(value).model,'fox');assert.ok(!avatar(value).includes('<img'));}
});
