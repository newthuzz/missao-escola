import {KEY as publicKey, URL as defaultUrl, isInvalidAuthSession} from '../cloud-api.mjs';
import {allEssayTopics, canUseEssay, essayCompetencies, essayLimits} from '../essay-catalog.mjs';
import {TutorError} from './tutor-shared.mjs';
import {tutorProvider} from './tutor-provider.mjs';
import {readTutorJson, tutorRuntimeEnv, withTutorCors} from './tutor-http.mjs';
import {enemAssessmentTypes, enemScoreBands, enemTangencyCompetencies, essayReviewPrompt, usesEnemRubric} from './essay-rubric.mjs';

const competencyIds = Object.keys(essayCompetencies);
const incomplete = () => new TutorError('A IA retornou uma correção incompleta. Tente novamente.', 502);

function requiredText(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw incomplete();
  }
  return value.trim();
}

function shortList(values) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 3) {
    throw incomplete();
  }
  return values.map(value => requiredText(value, 450));
}

function essayParagraphs(essay) {
  const paragraphs = [];
  for (const match of essay.matchAll(/[^\n\r]+/g)) {
    const text = match[0].trim();
    if (text) paragraphs.push({number:paragraphs.length + 1, text, start:match.index + match[0].indexOf(text)});
  }
  return paragraphs;
}

function reviewIssues(items, paragraphs) {
  if (!Array.isArray(items) || items.length > 10) throw incomplete();
  const accepted = [];
  const seen = new Set();
  for (const item of items) {
    if (!competencyIds.includes(item?.competency) || !['erro', 'melhoria'].includes(item.type) || typeof item.excerpt !== 'string') continue;
    const excerpt = item.excerpt.trim();
    let anchor = {};
    if (excerpt) {
      if (!Number.isInteger(item.paragraph) || excerpt.length > 180) continue;
      const paragraph = paragraphs[item.paragraph - 1];
      if (!paragraph) continue;
      const offset = paragraph.text.indexOf(excerpt);
      if (offset < 0 || paragraph.text.indexOf(excerpt, offset + 1) >= 0) continue;
      const start = paragraph.start + offset;
      anchor = {paragraph:item.paragraph, excerpt, start, end:start + excerpt.length};
    } else if (item.type !== 'melhoria' || item.paragraph !== null) {
      continue;
    }
    const explanation = requiredText(item.explanation, 450);
    const key = JSON.stringify([item.competency, anchor.start ?? explanation, anchor.end]);
    if (seen.has(key)) continue;
    seen.add(key);
    const rewrite = typeof item.rewrite === 'string' ? item.rewrite.trim() : '';
    accepted.push({
      ...anchor,
      competency:item.competency,
      type:item.type,
      explanation,
      suggestion:requiredText(item.suggestion, 450),
      ...(rewrite && rewrite.length <= 330 ? {rewrite} : {})
    });
  }
  return accepted;
}

export function parseEssayReview(output, essay, scored = false) {
  let data;
  try {
    const content = output.trim().replace(/^\x60{3}(?:json)?\s*/i, '').replace(/\s*\x60{3}$/, '');
    if (content.length > 22000) throw Error('Output limit');
    data = JSON.parse(content);
  } catch {
    throw incomplete();
  }
  if (!Array.isArray(data?.competencies) || data.competencies.length !== competencyIds.length) {
    throw incomplete();
  }
  const assessment = scored ? data.assessment : 'regular';
  if (!enemAssessmentTypes.includes(assessment)) throw incomplete();
  const invalidated = assessment === 'fuga-ao-tema' || assessment === 'tipo-incompativel';
  const reason = assessment === 'regular' ? '' : requiredText(data.assessmentReason, 650);
  const issues = reviewIssues(data.issues, essayParagraphs(essay));
  const notes = new Map(data.competencies.map(item => [item?.id, item]));
  const competencies = competencyIds.map(id => {
    const note = notes.get(id);
    let score = null;
    if (scored && !invalidated) {
      if (!enemScoreBands.includes(note?.score)) throw incomplete();
      score = assessment === 'tangenciamento' && enemTangencyCompetencies.has(id) ? Math.min(note.score, 40) : note.score;
    }
    const excerpt = issues.find(issue => issue.competency === id && issue.excerpt)?.excerpt;
    return {
      id,
      score,
      feedback: requiredText(note?.feedback, 650),
      tip: requiredText(note?.tip, 550),
      ...(excerpt ? {excerpt} : {})
    };
  });
  return {
    summary: requiredText(data.summary, 900),
    strengths: shortList(data.strengths),
    priorities: shortList(data.priorities),
    competencies,
    issues,
    estimate: scored ? {
      total: invalidated ? 0 : competencies.reduce((sum, note) => sum + note.score, 0),
      assessment,
      reason
    } : null,
    nextStep: requiredText(data.nextStep, 550)
  };
}

async function reviewRequest(request, env) {
  const headers = {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
  const reply = (body, status = 200) => Response.json(body, {status, headers});
  if (request.method !== 'POST') return reply({error:'Método não permitido.'}, 405);
  const auth = request.headers.get('Authorization') || '';
  if (!/^Bearer \S+$/.test(auth)) return reply({error:'Entre na sua conta para corrigir a redação.'}, 401);

  try {
    const body = await readTutorJson(request);
    const topic = allEssayTopics.find(entry => entry.id === body?.topicId);
    const essay = typeof body?.essay === 'string' ? body.essay.trim() : '';
    if (!topic) throw new TutorError('Escolha um tema da área de Redação.');
    const grade = body.grade;
    // Older tabs can finish already opened proposals that predate the grade field.
    if ((grade !== undefined || topic.genre) && !canUseEssay(grade)) {
      throw new TutorError('A correção está disponível a partir do 7º ano. Confira seu ano escolar no estudo.', 403);
    }
    if (essay.length < essayLimits.min || essay.length > essayLimits.max) {
      throw new TutorError('Escreva entre ' + essayLimits.min + ' e ' + essayLimits.max + ' caracteres para enviar a redação.');
    }
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const selected = tutorProvider(env);
    if (!serviceKey || env.TUTOR_ENABLED !== 'true' || !selected.configured) {
      throw new TutorError('A correção está indisponível no momento. Tente novamente mais tarde.', 503);
    }
    const base = env.SUPABASE_URL || defaultUrl;
    const userResponse = await fetch(base + '/auth/v1/user', {
      headers:{apikey:env.SUPABASE_ANON_KEY || publicKey, Authorization:auth},
      signal:AbortSignal.timeout(8000)
    });
    const user = await userResponse.json().catch(() => null);
    if (isInvalidAuthSession(userResponse.status, user?.error_code || user?.code)) throw new TutorError('Sua sessão expirou. Entre novamente.', 401);
    if (!userResponse.ok || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(user?.id ?? '')) {
      throw new TutorError('Não foi possível verificar sua conta agora. Tente novamente.', 502);
    }
    if (request.signal.aborted) return reply({error:'A correção foi interrompida.'}, 499);
    const quota = await fetch(base + '/rest/v1/rpc/reserve_essay_review', {
      method:'POST',
      headers:{apikey:serviceKey, Authorization:'Bearer ' + serviceKey, 'Content-Type':'application/json'},
      body:JSON.stringify({p_user:user.id}),
      signal:AbortSignal.timeout(8000)
    });
    if (!quota.ok) {
      const error = await quota.json().catch(() => null);
      if (error?.code === 'P0001' && error.message?.startsWith('LIMIT:')) throw new TutorError(error.message.slice(6), 429);
      throw new TutorError('A correção está indisponível no momento. Tente novamente mais tarde.', 503);
    }

    const scored = usesEnemRubric(topic);
    const paragraphs = essayParagraphs(essay).map(({number, text}) => ({number, text}));
    const messages = [
      {role:'system', content:essayReviewPrompt(scored)},
      {role:'user', content:JSON.stringify({topic:topic.title, level:topic.level, guide:topic.guide, genre:topic.genre, grade, paragraphs})}
    ];
    const result = await selected.create().run({messages, maxOutputTokens:5000, timeoutMs:35000, stream:false, signal:request.signal});
    return reply({review:parseEssayReview(result?.response, essay, scored)});
  } catch (error) {
    return reply({error:error instanceof TutorError ? error.message : 'Não foi possível corrigir seu texto agora. O rascunho continua disponível.'}, error instanceof TutorError ? error.status : 502);
  }
}

export function handleEssayRequest({request, env}) {
  return withTutorCors(request, env, () => reviewRequest(request, env));
}

if (typeof Deno !== 'undefined' && Deno.serve) {
  Deno.serve(request => handleEssayRequest({request, env:tutorRuntimeEnv()}));
}
