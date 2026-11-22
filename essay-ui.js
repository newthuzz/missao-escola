import {getAccountToken, getAccountUser} from './account.js';
import {KEY, URL} from './cloud-api.mjs';
import {essayCompetencies, essayLevels, essayLimits, essayTopics} from './essay-catalog.mjs';

const page = document.querySelector('#page-redacao');
const element = id => page.querySelector('#' + id);
const form = element('essay-form');
const editor = element('essay-text');
const levels = element('essay-filters');
const topics = element('essay-topics');
const submit = element('essay-submit');
const login = element('essay-login');
const status = element('essay-status');
const reviewPanel = element('essay-review');
const feedback = element('essay-feedback');
const drafts = new Map();
const count = new Intl.NumberFormat('pt-BR');

let owner = getAccountUser();
let selected = lastTopic();
let level = selected.level;
let inFlight = null;
let reviewedText = null;
let returningFromLogin = false;

function storageKey(entry) {
  return 'missao-escola-essay-v1:' + (owner || 'visitante') + ':' + entry;
}

function lastTopic() {
  try {
    const id = localStorage.getItem(storageKey('ultimo-tema'));
    return essayTopics.find(topic => topic.id === id) ?? essayTopics[0];
  } catch {
    return essayTopics[0];
  }
}

function readDraft() {
  const key = storageKey(selected.id);
  if (drafts.has(key)) return drafts.get(key);
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function saveDraft() {
  const key = storageKey(selected.id);
  const text = editor.value;
  drafts.set(key, text);
  try {
    if (text) localStorage.setItem(key, text);
    else localStorage.removeItem(key);
  } catch {
    status.textContent = 'O navegador não pôde salvar o rascunho. Seu texto continua disponível nesta aba.';
  }
}

function updateEditor() {
  const text = editor.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  element('essay-count').textContent = count.format(words) + (words === 1 ? ' palavra' : ' palavras') + ' · ' + count.format(editor.value.length) + '/' + count.format(essayLimits.max) + ' caracteres';
  submit.hidden = !owner;
  login.hidden = Boolean(owner);
  submit.disabled = Boolean(inFlight) || text === reviewedText;
}

function cancelReview() {
  inFlight?.abort();
  inFlight = null;
  reviewedText = null;
  reviewPanel.hidden = true;
  feedback.replaceChildren();
  status.textContent = '';
}

function chooseTopic(topic, focus = false) {
  cancelReview();
  selected = topic;
  try { localStorage.setItem(storageKey('ultimo-tema'), topic.id); } catch {}
  for (const button of topics.children) button.setAttribute('aria-pressed', String(button.dataset.essayTopic === topic.id));
  element('essay-topic-level').textContent = topic.year ? 'Enem ' + topic.year : essayLevels[topic.level];
  element('essay-topic-title').textContent = topic.title;
  element('essay-topic-guide').textContent = topic.guide;
  const source = element('essay-topic-source');
  source.hidden = !topic.source;
  if (topic.source) source.href = topic.source;
  else source.removeAttribute('href');
  editor.value = readDraft();
  updateEditor();
  if (focus && matchMedia('(max-width: 820px)').matches) element('essay-topic-title').focus();
}

function chooseLevel(value) {
  level = value;
  for (const button of levels.children) button.setAttribute('aria-pressed', String(button.dataset.essayLevel === level));
  const entries = essayTopics.filter(topic => topic.level === level);
  topics.replaceChildren(...entries.map(topic => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.essayTopic = topic.id;
    const title = document.createElement('strong');
    title.textContent = topic.title;
    if (topic.year) {
      const year = document.createElement('span');
      year.textContent = 'Enem ' + topic.year;
      button.append(year);
    }
    button.append(title);
    return button;
  }));
  chooseTopic(selected.level === level ? selected : entries[0]);
}

function paragraph(tag, text) {
  const item = document.createElement(tag);
  item.textContent = text;
  return item;
}

function renderFeedback(review) {
  const overview = paragraph('p', review.summary);
  overview.className = 'essay-review-summary';

  const reviewList = (header, items) => {
    const card = document.createElement('div');
    const list = document.createElement('ul');
    list.append(...items.map(value => paragraph('li', value)));
    card.append(paragraph('h3', header), list);
    return card;
  };
  const priorities = document.createElement('div');
  priorities.className = 'essay-review-lists';
  priorities.append(reviewList('O que funcionou', review.strengths), reviewList('O que melhorar primeiro', review.priorities));

  const rubric = document.createElement('div');
  rubric.className = 'essay-rubric';
  for (const note of review.competencies) {
    const detail = document.createElement('details');
    detail.append(paragraph('summary', essayCompetencies[note.id]));
    detail.append(paragraph('p', note.feedback));
    if (note.excerpt) detail.append(paragraph('blockquote', note.excerpt));
    detail.append(paragraph('p', 'Na próxima versão: ' + note.tip));
    rubric.append(detail);
  }
  const nextStep = document.createElement('div');
  nextStep.className = 'essay-next-step';
  nextStep.append(paragraph('h3', 'Próximo passo'), paragraph('p', review.nextStep));
  feedback.replaceChildren(overview, priorities, paragraph('h3', 'Feedback por competência'), rubric, nextStep);
  reviewPanel.hidden = false;
}

for (const [value, label] of Object.entries(essayLevels)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.essayLevel = value;
  button.textContent = label;
  levels.append(button);
}
levels.addEventListener('click', event => {
  const value = event.target.closest('[data-essay-level]')?.dataset.essayLevel;
  if (value && value !== level) chooseLevel(value);
});
topics.addEventListener('click', event => {
  const id = event.target.closest('[data-essay-topic]')?.dataset.essayTopic;
  if (id && id !== selected.id) chooseTopic(essayTopics.find(topic => topic.id === id), true);
});
editor.maxLength = essayLimits.max;
editor.addEventListener('input', () => {
  if (!inFlight) status.textContent = reviewedText !== null && editor.value.trim() !== reviewedText ? 'Você editou o texto. Corrija novamente para revisar esta versão.' : '';
  saveDraft();
  updateEditor();
});
login.addEventListener('click', () => {
  returningFromLogin = true;
  navigate('social');
});

window.addEventListener('missao-account-change', () => {
  const next = getAccountUser();
  if (next === owner) return;
  const continuingGuestDraft = !owner && next && returningFromLogin;
  const guestDraft = continuingGuestDraft ? editor.value : '';
  owner = next;
  if (!continuingGuestDraft) selected = lastTopic();
  chooseLevel(selected.level);
  if (owner && guestDraft && !editor.value) {
    editor.value = guestDraft;
    saveDraft();
    updateEditor();
  }
});
window.addEventListener('missao-account-ready', () => {
  if (returningFromLogin && owner && state.page === 'social') navigate('redacao');
  returningFromLogin = false;
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!owner || inFlight) return;
  const essay = editor.value.trim();
  if (essay === reviewedText) return;
  if (essay.length < essayLimits.min || essay.length > essayLimits.max) {
    status.textContent = 'Escreva pelo menos ' + essayLimits.min + ' caracteres antes de pedir a correção.';
    editor.focus();
    return;
  }
  const expectedOwner = owner;
  const topicId = selected.id;
  const controller = new AbortController();
  inFlight = controller;
  const timer = setTimeout(() => controller.abort(), 45000);
  updateEditor();
  status.textContent = 'A IA está lendo e comentando sua redação…';
  try {
    const token = await getAccountToken();
    if (inFlight !== controller || owner !== expectedOwner) return;
    const response = await fetch(URL + '/functions/v1/essay-review', {
      method:'POST',
      cache:'no-store',
      headers:{apikey:KEY, Authorization:'Bearer ' + token, 'Content-Type':'application/json'},
      body:JSON.stringify({topicId, essay}),
      signal:controller.signal
    });
    const result = await response.json().catch(() => null);
    if (inFlight !== controller || owner !== expectedOwner) return;
    if (!response.ok || !result?.review) {
      throw Error(response.status === 404 ? 'A correção de redações está indisponível no momento. Seu rascunho continua disponível.' :
        result?.error || 'Não foi possível corrigir agora. Tente novamente.');
    }
    renderFeedback(result.review);
    reviewedText = essay;
    status.textContent = editor.value.trim() === essay ? 'Correção pronta. Use o feedback para planejar a próxima versão.' : 'O feedback é da versão enviada. Corrija novamente para revisar o texto editado.';
    if (state.page === 'redacao') element('essay-review-title').focus();
  } catch (error) {
    if (inFlight === controller) status.textContent = controller.signal.aborted ? 'A correção demorou. Seu rascunho está disponível para tentar novamente.' : error.message;
  } finally {
    clearTimeout(timer);
    if (inFlight === controller) {
      inFlight = null;
      updateEditor();
    }
  }
});

chooseLevel(level);
