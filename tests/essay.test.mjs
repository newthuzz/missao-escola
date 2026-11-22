import {test} from 'node:test';
import assert from 'node:assert/strict';
import {essayCompetencies} from '../essay-catalog.mjs';
import {handleEssayRequest, parseEssayReview} from '../server/essay-edge.mjs';

const user = '00000000-0000-4000-8000-000000000001';
const text = 'A escola pode incentivar a leitura com clubes de livros. Os encontros permitem compartilhar impressões e convidar colegas a explorar novos gêneros sem pressão.';
const output = {
  summary:'A proposta de leitura tem um objetivo claro.',
  strengths:['A ação é concreta.'],
  priorities:['Mostre como organizar os encontros.'],
  competencies:Object.keys(essayCompetencies).map(id => ({
    id,
    feedback:'Você apresentou uma proposta.',
    tip:'Explique como a escola pode oferecer espaço.',
    excerpt:id === 'tema' ? 'clubes de livros' : 'trecho inventado'
  })),
  nextStep:'Reescreva o último parágrafo com um exemplo.'
};
const payload = {topicId:'leitura', essay:text, userId:'forged-user'};
const env = {TUTOR_ALLOWED_ORIGINS:'https://school.example', TUTOR_ENABLED:'true', OPENAI_API_KEY:'private-provider-key', SUPABASE_SERVICE_ROLE_KEY:'private-service-key'};

function request(body, options = {}) {
  const headers = {'Content-Type':'application/json', Origin:options.origin ?? 'https://school.example'};
  if (!options.noAuth) headers.Authorization = 'Bearer student-token';
  return new Request('https://test.supabase.co/functions/v1/essay-review', {method:'POST', headers, body:JSON.stringify(body)});
}

test('keeps only literal quotes and rejects an incomplete rubric', () => {
  const review = parseEssayReview(JSON.stringify(output), text);
  assert.equal(review.competencies.length, 5);
  assert.equal(review.competencies.find(note => note.id === 'tema').excerpt, 'clubes de livros');
  assert.equal(review.competencies.find(note => note.id === 'coesao').excerpt, undefined);
  assert.throws(() => parseEssayReview(JSON.stringify({...output, competencies:[output.competencies[0]]}), text), /incompleta/);
});

test('authenticates first, reserves shared quota and sends the theme and text to the provider', async () => {
  const previous = globalThis.fetch;
  let calls = [], deny = false, fail = false;
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    if (url.endsWith('/auth/v1/user')) {
      assert.equal(options.headers.Authorization, 'Bearer student-token');
      return Response.json({id:user});
    }
    const body = JSON.parse(options.body);
    if (url.endsWith('/reserve_essay_review')) {
      assert.deepEqual(body, {p_user:user});
      assert.equal(options.headers.Authorization, 'Bearer private-service-key');
      return deny ? Response.json({code:'P0001', message:'LIMIT:Aguarde.'}, {status:400}) : new Response(null, {status:204});
    }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(body.stream, false);
    assert.equal(body.store, false);
    const submitted = JSON.parse(body.input[0].content);
    assert.equal(submitted.essay, text);
    assert.equal(submitted.level, 'inicio');
    assert.match(submitted.topic, /leitura/);
    assert.ok(!JSON.stringify(body).includes('private-service-key'));
    return Response.json({status:fail?'incomplete':'completed', output:[{type:'message', content:[{type:'output_text', text:JSON.stringify(output)}]}]});
  };
  try {
    for (const [body, options, status] of [[payload,{noAuth:true},401],[payload,{origin:'https://unknown.example'},403],
      [{...payload,topicId:'unknown'},{},400],[{...payload,essay:'curto'},{},400],[{...payload,essay:'x'.repeat(5001)},{},400]]) {
      const res = await handleEssayRequest({request:request(body, options), env});
      assert.equal(res.status, status);
    }
    assert.equal(calls.length, 0);

    deny = true;
    assert.equal((await handleEssayRequest({request:request(payload),env})).status, 429);
    assert.equal(calls.length, 2);
    deny = false;
    fail = true;
    assert.equal((await handleEssayRequest({request:request(payload),env})).status, 502);
    fail = false;

    const result = await handleEssayRequest({request:request(payload), env});
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('Access-Control-Allow-Origin'), 'https://school.example');
    assert.equal((await result.json()).review.nextStep, output.nextStep);
  } finally {
    globalThis.fetch = previous;
  }
});
