import {test} from 'node:test';
import assert from 'node:assert/strict';
test('journey identity follows the active account and ignores late profile responses',async()=>{
 let active=true,renders=0;
 globalThis.document={querySelector:()=>active?{}:null};globalThis.window={renderMap:()=>renders++};
 const {setIslandAvatarAccount,islandAvatarReceiver}=await import('../island-avatar.js');
 const render=()=>window.JourneyAvatar.render();
 assert.match(render(),/data-journey-avatar="local-default"/);setIslandAvatarAccount('a');
 const old=islandAvatarReceiver('a'),current=islandAvatarReceiver('a');
 current({avatar:'dragon~violet~crown'});assert.match(render(),/data-journey-avatar="dragon~violet~crown"/);assert.match(render(),/viewBox="0 0 200 360"/);
 old({avatar:'cat'});assert.match(render(),/dragon~violet~crown/);
 const count=renders;setIslandAvatarAccount('a');assert.equal(renders,count);assert.match(render(),/dragon~violet~crown/);
 active=false;const update=islandAvatarReceiver('a');update({avatar:'axolotl~mint~goggles'});assert.equal(renders,count);assert.match(render(),/axolotl~mint~goggles/);
 active=true;setIslandAvatarAccount('b');assert.match(render(),/data-journey-avatar="local-default"/);update({avatar:'fox'});assert.match(render(),/data-journey-avatar="local-default"/);
 islandAvatarReceiver('b')({avatar:'robot'});assert.match(render(),/data-journey-avatar="robot"/);
 setIslandAvatarAccount(null);assert.match(render(),/data-journey-avatar="local-default"/);
 setIslandAvatarAccount('c');islandAvatarReceiver('c')({avatar:'<svg onload=alert(1)>'});assert.match(render(),/data-journey-avatar="local-default"/);
});
