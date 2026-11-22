import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allEssayTopics, essayCompetencies, essayTopicsForGrade} from '../essay-catalog.mjs';
import {handleEssayRequest, parseEssayReview} from '../server/essay-edge.mjs';

const user = '00000000-0000-4000-8000-000000000001';
const text = 'A escola pode incentivar a leitura com clubes de livros.\n\n  Os encontros permitem compartilhar impressões e convidar colegas a explorar novos gêneros sem pressão.';
const output = {
  summary:'A proposta de leitura tem um objetivo claro.',
  strengths:['A ação é concreta.'],
  priorities:['Mostre como organizar os encontros.'],
  competencies:Object.keys(essayCompetencies).map(id => ({
    id,
    feedback:'Você apresentou uma proposta.',
    tip:'Explique como a escola pode oferecer espaço.',
    score:null
  })),
  issues:[
    {competency:'tema', type:'melhoria', paragraph:1, excerpt:'clubes de livros', explanation:'A ideia está nomeada, mas falta explicar o funcionamento.', suggestion:'Descreva como seriam os encontros.', rewrite:'clubes de livros com encontros semanais'},
    {competency:'argumentacao', type:'melhoria', paragraph:2, excerpt:'compartilhar impressões', explanation:'Falta explicar o resultado da troca.', suggestion:'Inclua um exemplo do que um colega aprenderia.'},
    {competency:'coesao', type:'erro', paragraph:2, excerpt:'trecho inventado', explanation:'Comentário sem evidência.', suggestion:'Revise.'},
    {competency:'linguagem', type:'erro', paragraph:1, excerpt:'compartilhar impressões', explanation:'Trecho atribuído ao parágrafo errado.', suggestion:'Revise.'},
    {competency:'intervencao', type:'melhoria', paragraph:null, excerpt:'', explanation:'Não há um responsável indicado.', suggestion:'Diga quem organizaria os encontros.'}
  ],
  assessment:'regular',
  assessmentReason:'',
  nextStep:'Reescreva o último parágrafo com um exemplo.'
};
const scoredOutput = {
  ...output,
  competencies:output.competencies.map((note, index) => ({...note, score:[160, 120, 120, 160, 80][index]}))
};
const payload = {topicId:'leitura', essay:text, userId:'forged-user'};
const env = {TUTOR_ALLOWED_ORIGINS:'https://school.example', TUTOR_ENABLED:'true', OPENAI_API_KEY:'private-provider-key', SUPABASE_SERVICE_ROLE_KEY:'private-service-key'};

function request(body, options = {}) {
  const headers = {'Content-Type':'application/json', Origin:options.origin ?? 'https://school.example'};
  if (!options.noAuth) headers.Authorization = 'Bearer student-token';
  return new Request('https://test.supabase.co/functions/v1/essay-review', {method:'POST', headers, body:JSON.stringify(body)});
}

test('locates only verified excerpts, keeps missing elements and rejects an incomplete rubric', () => {
  const review = parseEssayReview(JSON.stringify(output), text);
  assert.equal(review.competencies.length, 5);
  assert.equal(review.competencies.find(note => note.id === 'tema').excerpt, 'clubes de livros');
  assert.equal(review.estimate, null);
  assert.deepEqual(review.issues.map(issue => issue.competency), ['tema', 'argumentacao', 'intervencao']);
  const second = review.issues[1];
  assert.equal(second.start, text.indexOf('compartilhar impressões'));
  assert.equal(text.slice(second.start, second.end), second.excerpt);
  assert.equal(second.paragraph, 2);
  assert.equal(review.issues[2].start, undefined);
  assert.throws(() => parseEssayReview(JSON.stringify({...output, competencies:[output.competencies[0]]}), text), /incompleta/);
});

test('sums Enem score bands and applies the rules for a partially addressed or off-topic essay', () => {
  assert.equal(parseEssayReview(JSON.stringify(scoredOutput), text, true).estimate.total, 640);

  const tangency = parseEssayReview(JSON.stringify({...scoredOutput, assessment:'tangenciamento', assessmentReason:'Falta discutir o acesso às bibliotecas.'}), text, true);
  assert.deepEqual(tangency.competencies.map(note => note.score), [160, 40, 40, 160, 40]);
  assert.equal(tangency.estimate.total, 440);

  const offTopic = parseEssayReview(JSON.stringify({...output, assessment:'fuga-ao-tema', assessmentReason:'O texto discute leitura, que é alheia a esta proposta.'}), text, true);
  assert.equal(offTopic.estimate.total, 0);
  assert.ok(offTopic.competencies.every(note => note.score === null));
  assert.throws(() => parseEssayReview(JSON.stringify({...scoredOutput, competencies:scoredOutput.competencies.map(note => ({...note, score:199}))}), text, true), /incompleta/);
});

test('every eligible year has its own activity pool, guidance source and both difficulty levels', () => {
  for (const grade of [null, 1, 6, 13, '7']) assert.deepEqual(essayTopicsForGrade(grade), []);
  assert.equal(new Set(allEssayTopics.map(topic => topic.id)).size, allEssayTopics.length);
  const featured = ['carta-redes', 'telas-e-caderno', 'lixo-no-bairro', 'celular-como-ferramenta', 'pressao-para-crescer', 'situacao-de-rua'];
  for (const [index, id] of featured.entries()) {
    const grade = index + 7;
    const topics = essayTopicsForGrade(grade);
    assert.ok(topics.filter(topic => topic.level === 'inicio').length >= 6);
    assert.ok(topics.filter(topic => topic.level === 'pratica').length >= 6);
    const enemYears = topics.filter(topic => topic.level === 'enem' && topic.source).map(topic => topic.year);
    assert.deepEqual(enemYears, grade >= 10 ? Array.from({length:12}, (_, i) => 2015 + i) : []);
    assert.match(topics.find(topic => topic.id === id).source, /^https:\/\//);
    assert.ok(!featured.some(other => other !== id && topics.some(topic => topic.id === other)));
  }
});

test('authenticates first, reserves shared quota and sends the theme and text to the provider', async () => {
  const previous = globalThis.fetch;
  let calls = [], deny = false, fail = false;
  let expectedTopic = allEssayTopics.find(topic => topic.id === payload.topicId);
  let expectedGrade;
  let expectScore = false;
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
    assert.deepEqual(submitted.paragraphs, text.split(/\n+/).map((line, index) => ({number:index + 1, text:line.trim()})));
    assert.equal(submitted.level, expectedTopic.level);
    assert.equal(submitted.topic, expectedTopic.title);
    assert.equal(submitted.guide, expectedTopic.guide);
    assert.equal(submitted.genre, expectedTopic.genre);
    assert.equal(submitted.grade, expectedGrade);
    assert.equal(body.instructions.includes('0, 40, 80, 120, 160 ou 200'), expectScore);
    assert.ok(!JSON.stringify(body).includes('private-service-key'));
    return Response.json({status:fail?'incomplete':'completed', output:[{type:'message', content:[{type:'output_text', text:JSON.stringify(expectScore ? scoredOutput : output)}]}]});
  };
  try {
    for (const [body, options, status] of [[payload,{noAuth:true},401],[payload,{origin:'https://unknown.example'},403],
      [{...payload,topicId:'unknown'},{},400],[{...payload,essay:'curto'},{},400],[{...payload,essay:'x'.repeat(5001)},{},400],
      [{...payload,grade:6},{},403],[{...payload,topicId:'carta-redes'},{},403]]) {
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

    expectedTopic = allEssayTopics.find(topic => topic.id === 'carta-faixa-escola');
    expectedGrade = 7;
    const newTopicReview = await handleEssayRequest({request:request({...payload, topicId:expectedTopic.id, grade:expectedGrade}), env});
    assert.equal(newTopicReview.status, 200);
    assert.equal((await newTopicReview.json()).review.estimate, null);

    expectedGrade = 12;
    expectScore = true;
    for (const id of ['enem-2026', 'alertas-de-enchente']) {
      expectedTopic = allEssayTopics.find(topic => topic.id === id);
      const scored = await handleEssayRequest({request:request({...payload, topicId:id, grade:expectedGrade}), env});
      assert.equal(scored.status, 200);
      assert.equal((await scored.json()).review.estimate.total, 640);
    }
  } finally {
    globalThis.fetch = previous;
  }
});
