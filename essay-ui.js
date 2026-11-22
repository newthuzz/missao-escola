import {getAccountToken, getAccountUser} from './account.js';
import {KEY, URL} from './cloud-api.mjs';
import {allEssayTopics, essayCompetencies, essayLevels, essayLimits, essayTopics} from './essay-catalog.mjs';

const page = document.querySelector('#page-redacao');
const element = id => page.querySelector('#' + id);
const form = element('essay-form');
const editor = element('essay-text');
const levels = element('essay-filters');
const topics = element('essay-topics');
const draw = element('essay-draw');
const workspace = element('essay-workspace');
const submit = element('essay-submit');
const login = element('essay-login');
const status = element('essay-status');
const reviewPanel = element('essay-review');
const feedback = element('essay-feedback');
const saved = new Map();
const count = new Intl.NumberFormat('pt-BR');
const levelOptions = {todos: 'Todas as dificuldades', ...essayLevels};

let owner = getAccountUser();
let selected = null;
let level = 'todos';
let inFlight = null;
let reviewedText = null;
let returningFromLogin = false;

function storageKey(entry) {
  return 'missao-escola-essay-v1:' + (owner || 'visitante') + ':' + entry;
}

function read(entry) {
  const key = storageKey(entry);
  if (saved.has(key)) return saved.get(key);
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function write(entry, value) {
  const key = storageKey(entry);
  saved.set(key, value);
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function lastTopic() {
  const drawn = read('tema-sorteado');
  const id = drawn || read('ultimo-tema');
  if (read(id).trim()) return allEssayTopics.find(topic => topic.id === id) ?? null;
  return drawn ? essayTopics.find(topic => topic.id === drawn) ?? null : null;
}

function saveDraft() {
  if (!write(selected.id, editor.value)) {
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
  workspace.hidden = !topic;
  draw.textContent = topic ? 'Sortear outro tema' : 'Iniciar treino';
  element('essay-draw-help').textContent = topic ? 'A dificuldade vale para o próximo sorteio.' : 'O tema aparece ao iniciar o treino.';
  if (topic) write('tema-sorteado', topic.id);
  element('essay-topic-level').textContent = topic?.year ? 'Enem ' + topic.year : essayLevels[topic?.level] ?? '';
  element('essay-topic-title').textContent = topic?.title ?? '';
  element('essay-topic-guide').textContent = topic?.guide ?? '';
  const source = element('essay-topic-source');
  source.hidden = !topic?.source;
  if (topic?.source) source.href = topic.source;
  else source.removeAttribute('href');
  editor.value = topic ? read(topic.id) : '';
  renderDrafts();
  updateEditor();
  if (focus) element('essay-topic-title').focus();
}

function chooseLevel(value) {
  level = value;
  write('nivel-sorteio', level);
  for (const button of levels.children) button.setAttribute('aria-pressed', String(button.dataset.essayLevel === level));
}

function drawTopic() {
  const pool = essayTopics.filter(topic => level === 'todos' || topic.level === level);
  const history = new Set(read('historico-sorteio').split(',').filter(Boolean));
  if (selected) history.add(selected.id);
  let available = pool.filter(topic => !history.has(topic.id));
  if (!available.length) {
    for (const topic of pool) history.delete(topic.id);
    available = pool.filter(topic => topic !== selected);
    if (!available.length) available = pool;
  }
  const topic = available[Math.floor(Math.random() * available.length)];
  history.add(topic.id);
  write('historico-sorteio', [...history].join(','));
  chooseTopic(topic, true);
}

function renderDrafts() {
  const entries = allEssayTopics.filter(topic => read(topic.id).trim());
  element('essay-drafts').hidden = !entries.length;
  topics.replaceChildren(...entries.map(topic => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.essayTopic = topic.id;
    button.setAttribute('aria-pressed', String(topic === selected));
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

for (const [value, label] of Object.entries(levelOptions)) {
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
draw.addEventListener('click', drawTopic);
topics.addEventListener('click', event => {
  const id = event.target.closest('[data-essay-topic]')?.dataset.essayTopic;
  if (id && id !== selected?.id) chooseTopic(allEssayTopics.find(topic => topic.id === id), true);
});
editor.maxLength = essayLimits.max;
editor.addEventListener('input', () => {
  if (!selected) return;
  if (!inFlight) status.textContent = reviewedText !== null && editor.value.trim() !== reviewedText ? 'Você editou o texto. Corrija novamente para revisar esta versão.' : '';
  const hadDraft = Boolean(read(selected.id).trim());
  saveDraft();
  if (hadDraft !== Boolean(editor.value.trim())) renderDrafts();
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
  if (!continuingGuestDraft) element('essay-drafts').open = false;
  chooseLevel(continuingGuestDraft ? level : savedLevel());
  chooseTopic(continuingGuestDraft ? selected : lastTopic());
  if (owner && guestDraft && !editor.value) {
    editor.value = guestDraft;
    saveDraft();
    renderDrafts();
    updateEditor();
  }
});
window.addEventListener('missao-account-ready', () => {
  if (returningFromLogin && owner && state.page === 'social') navigate('redacao');
  returningFromLogin = false;
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!owner || !selected || inFlight) return;
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

function savedLevel() {
  const value = read('nivel-sorteio');
  return Object.hasOwn(levelOptions, value) ? value : 'todos';
}

chooseLevel(savedLevel());
chooseTopic(lastTopic());
