import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAvatarMotion,avatarStates} from '../reward-motion.js';
test('organic state machine uses varied 8–18 second rests, discrete gestures and return to idle',()=>{
 const values=[.1,.1,.8,.9,.1,.8,.2],random=()=>values.shift()??.3,m=createAvatarMotion(random);
 assert.equal(m.state,'IDLE');assert.equal(m.remaining,9000);m.advance(8999);assert.equal(m.state,'IDLE');m.advance(1);assert.equal(m.state,'LOOK_AROUND');assert.equal(m.direction,'right');m.advance(2800);assert.equal(m.state,'RETURN_TO_IDLE');m.advance(450);assert.equal(m.state,'IDLE');assert.equal(m.remaining,17000);m.advance(17000);assert.equal(m.state,'ARM_GESTURE');
});
test('interaction priority interrupts spontaneous gestures and cannot interrupt a celebration',()=>{
 const m=createAvatarMotion(()=>.5);assert.equal(m.request('LOOK_AROUND'),true);assert.equal(m.request('GREETING'),true);assert.equal(m.request('LOOK_AROUND'),false);assert.equal(m.request('CELEBRATION'),true);assert.equal(m.request('GREETING'),false);assert.equal(m.request('invalid'),false);assert.equal(m.request('CELEBRATION'),false);
 m.advance(avatarStates.CELEBRATION);assert.equal(m.state,'RETURN_TO_IDLE');m.advance(450);assert.equal(m.state,'IDLE');m.reset();assert.equal(m.state,'IDLE');assert.ok(m.remaining>=8000&&m.remaining<=18000);
});
