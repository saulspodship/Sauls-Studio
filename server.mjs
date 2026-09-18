import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import searchBroll from './api/search-broll.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, 'public');
const dataDir = join(__dirname, 'data');
const projectStore = join(dataDir, 'projects.json');
const PORT = Number(process.env.PORT || 3000);
const SCRIPT_WEBHOOK = process.env.AI_SCRIPT_WEBHOOK || '';
const RENDER_WEBHOOK = process.env.AI_RENDER_WEBHOOK || '';
// Keep all credentials on the server. Never expose this key in index.html or client-side JavaScript.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || '';
const APP_URL = process.env.APP_URL || '';
let cachedOpenRouterModel = '';

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon'
};

async function ensureStore() {
  await mkdir(dataDir, { recursive: true });
  if (!existsSync(projectStore)) await writeFile(projectStore, '[]', 'utf8');
}
async function getProjects() {
  await ensureStore();
  try { return JSON.parse(await readFile(projectStore, 'utf8')); } catch { return []; }
}
async function saveProjects(items) {
  await ensureStore();
  await writeFile(projectStore, JSON.stringify(items, null, 2), 'utf8');
}
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 1_000_000) throw new Error('Request body is too large');
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function safeTitle(value, fallback = 'Untitled production') {
  return String(value || fallback).replace(/[<>]/g, '').slice(0, 140);
}
function localScript(project) {
  const title = safeTitle(project.title, 'A Bible story');
  const passage = project.passage ? ` (${project.passage})` : '';
  const objective = project.objective || 'teach the story faithfully and invite viewers to explore Scripture';
  return {
    hook: `What if ${title} changed everything?`,
    thesis: `${title}${passage} is more than an ancient account. It calls us to see God’s character, human response, and hope with fresh attention.`,
    narration: [
      { section: 'Hook', seconds: 0, text: `Here is the story of ${title}.` },
      { section: 'Context', seconds: 8, text: `We begin with the setting, the people, and the tension that brings this moment into focus.` },
      { section: 'Story', seconds: 24, text: `Walk through the key movement of the passage carefully, letting the biblical text lead the account.` },
      { section: 'Meaning', seconds: 52, text: `Notice what this reveals about God and the faithful response the passage calls forth.` },
      { section: 'Response', seconds: 74, text: `Today, we can ${objective}. Read the passage for yourself and continue the conversation.` }
    ],
    theologicalReview: 'Draft for editorial and theological review. Verify quotations, interpretive claims, and denominational framing before publishing.'
  };
}
async function postWebhook(url, payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal
    });
    if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
function readJsonObject(value) {
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('The script model did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}
function normaliseScript(draft, project) {
  const fallback = localScript(project);
  const narration = Array.isArray(draft?.narration) ? draft.narration.slice(0, 8).map((part, index) => ({
    section: safeTitle(part.section, ['Hook', 'Context', 'Story', 'Meaning', 'Response'][index] || 'Narration'),
    seconds: Math.max(0, Number(part.seconds ?? index * 15)),
    text: safeTitle(part.text, fallback.narration[Math.min(index, fallback.narration.length - 1)].text)
  })).filter(part => part.text) : fallback.narration;
  return {
    hook: safeTitle(draft?.hook, fallback.hook),
    thesis: safeTitle(draft?.thesis, fallback.thesis),
    narration: narration.length ? narration : fallback.narration,
    theologicalReview: safeTitle(draft?.theologicalReview, fallback.theologicalReview)
  };
}
async function resolveOpenRouterModel() {
  if (OPENROUTER_MODEL) return OPENROUTER_MODEL;
  if (cachedOpenRouterModel) return cachedOpenRouterModel;
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) throw new Error(`Could not retrieve OpenRouter’s model catalogue (${response.status})`);
  const body = await response.json();
  const models = Array.isArray(body.data) ? body.data : [];
  const free = models.filter(model => String(model.id || '').endsWith(':free'));
  const preferred = free.find(model => /qwen|llama|mistral|gemma/i.test(model.id || '')) || free[0];
  if (!preferred?.id) throw new Error('No OpenRouter free model is currently available. Set OPENROUTER_MODEL to a model you have access to.');
  cachedOpenRouterModel = preferred.id;
  return cachedOpenRouterModel;
}
async function createOpenRouterScript(project) {
  const model = await resolveOpenRouterModel();
  const system = [
    'You are the script editor for Saul’s Podship, a rigorous Christian theological media project.',
    'Create a concise, reverent video script grounded in the supplied source passage and do not invent events, dialogue, historical details, quotations, or certainty where the passage does not provide them.',
    'Do not reproduce Bible translation text. Refer viewers to the source passage instead.',
    'Return JSON only with exactly: hook, thesis, narration, theologicalReview.',
    'narration must be an array of 5 to 8 objects: {section, seconds, text}.',
    'theologicalReview must remind a human editor to verify claims, context, citations, and denominational framing before publication.'
  ].join(' ');
  const user = JSON.stringify({
    title: project.title, sourcePassage: project.passage || 'No passage supplied', type: project.type,
    format: project.format, durationSeconds: project.duration, template: project.template,
    audienceOutcome: project.objective || 'Teach clearly and invite viewers to read Scripture.',
    archiveContext: project.archiveIdea || null
  });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'X-OpenRouter-Title': "Saul's Podship Studio"
  };
  if (APP_URL) headers['HTTP-Referer'] = APP_URL;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers,
    body: JSON.stringify({ model, temperature: 0.45, max_tokens: 1400, messages: [
      { role: 'system', content: system }, { role: 'user', content: user }
    ] })
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`OpenRouter returned ${response.status}: ${detail}`);
  }
  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  const text = Array.isArray(content) ? content.map(item => item.text || '').join('') : content;
  return normaliseScript(readJsonObject(text), project);
}
async function runVercelStyleHandler(handler, req, res) {
  const response = {
    setHeader: (...args) => res.setHeader(...args),
    status: (statusCode) => ({ json: (payload) => json(res, statusCode, payload) })
  };
  return handler(req, response);
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/search-broll') return runVercelStyleHandler(searchBroll, req, res);
  if (pathname === '/api/health' && req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      scriptProvider: Boolean(SCRIPT_WEBHOOK || OPENROUTER_API_KEY),
      scriptMode: SCRIPT_WEBHOOK ? 'custom webhook' : OPENROUTER_API_KEY ? 'OpenRouter' : 'local draft',
      renderProvider: Boolean(RENDER_WEBHOOK)
    });
  }
  if (pathname === '/api/projects' && req.method === 'GET') return json(res, 200, { projects: await getProjects() });
  if (pathname === '/api/projects' && req.method === 'POST') {
    const incoming = await readBody(req);
    const project = {
      id: `pod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: safeTitle(incoming.title), type: incoming.type === 'general' ? 'general' : 'bible-story',
      storyId: String(incoming.storyId || ''), passage: String(incoming.passage || '').slice(0, 100),
      format: incoming.format === 'landscape' ? 'landscape' : 'reel',
      template: String(incoming.template || 'Split-screen presenter').slice(0, 80),
      style: String(incoming.style || 'Cinematic biblical').slice(0, 80),
      duration: Number(incoming.duration || 90), objective: String(incoming.objective || '').slice(0, 900),
      archiveIdea: incoming.archiveIdea && typeof incoming.archiveIdea === 'object' ? {
        collection: safeTitle(incoming.archiveIdea.collection, 'Podship Theological Archive'), kind: safeTitle(incoming.archiveIdea.kind, ''),
        id: safeTitle(incoming.archiveIdea.id, ''), title: safeTitle(incoming.archiveIdea.title, ''),
        answer: safeTitle(incoming.archiveIdea.answer, ''), reference: safeTitle(incoming.archiveIdea.reference, ''),
        note: safeTitle(incoming.archiveIdea.note, ''), source: String(incoming.archiveIdea.source || '').slice(0, 300)
      } : null,
      avatar: incoming.avatar || { enabled: true, name: 'Saul Avatar' },
      voice: incoming.voice || { enabled: true, name: 'Saul Voice' },
      status: 'draft', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    project.script = localScript(project);
    if (SCRIPT_WEBHOOK) {
      try { project.script = normaliseScript(await postWebhook(SCRIPT_WEBHOOK, { task: 'create_script', project, responseSchema: 'PodshipScriptV1' }), project); }
      catch (error) { project.scriptProviderError = error.message; }
    } else if (OPENROUTER_API_KEY) {
      try { project.script = await createOpenRouterScript(project); project.scriptProvider = 'OpenRouter'; }
      catch (error) { project.scriptProviderError = error.message; }
    }
    const items = await getProjects(); items.unshift(project); await saveProjects(items);
    return json(res, 201, { project });
  }
  const renderMatch = pathname.match(/^\/api\/projects\/([^/]+)\/render$/);
  if (renderMatch && req.method === 'POST') {
    const items = await getProjects(); const project = items.find(x => x.id === renderMatch[1]);
    if (!project) return json(res, 404, { error: 'Project not found' });
    const body = await readBody(req);
    const manifest = {
      schema: 'podship.render.v1', jobId: `render-${Date.now()}`, projectId: project.id,
      title: project.title, output: { format: project.format, duration: body.duration || project.duration, captions: true, safeMusic: true },
      layout: { template: project.template, visualPosition: project.format === 'reel' ? 'top' : 'right', avatarPosition: project.format === 'reel' ? 'bottom' : 'left' },
      assets: { avatar: project.avatar, voice: project.voice }, script: project.script, editorialGate: 'required'
    };
    project.updatedAt = new Date().toISOString();
    if (RENDER_WEBHOOK) {
      try {
        const result = await postWebhook(RENDER_WEBHOOK, { task: 'render_video', manifest });
        project.status = result.status || 'rendering'; project.render = result; await saveProjects(items);
        return json(res, 202, { mode: 'provider', job: result, manifest });
      } catch (error) {
        project.status = 'render blocked'; await saveProjects(items);
        return json(res, 502, { error: `Render provider error: ${error.message}`, manifest });
      }
    }
    project.status = 'ready for provider'; project.render = { status: 'needs-provider', manifestCreatedAt: new Date().toISOString() }; await saveProjects(items);
    return json(res, 202, { mode: 'manifest-only', job: project.render, manifest, message: 'No AI_RENDER_WEBHOOK is configured. The production manifest is ready to send to your approved renderer.' });
  }
  const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (projectMatch && req.method === 'PATCH') {
    const body = await readBody(req); const items = await getProjects(); const project = items.find(x => x.id === projectMatch[1]);
    if (!project) return json(res, 404, { error: 'Project not found' });
    for (const key of ['title','format','template','style','duration','objective','passage','archiveIdea','avatar','voice','script','status']) if (body[key] !== undefined) project[key] = body[key];
    project.updatedAt = new Date().toISOString(); await saveProjects(items); return json(res, 200, { project });
  }
  return json(res, 404, { error: 'Not found' });
}
async function serveStatic(res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const fullPath = normalize(join(publicDir, requested));
  if (!fullPath.startsWith(publicDir) || !existsSync(fullPath)) { res.writeHead(404); return res.end('Not found'); }
  const info = await stat(fullPath);
  if (info.isDirectory()) return serveStatic(res, `${requested.replace(/\/$/, '')}/index.html`);
  res.writeHead(200, { 'Content-Type': mime[extname(fullPath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(fullPath).pipe(res);
}

await ensureStore();
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url.pathname);
    return await serveStatic(res, decodeURIComponent(url.pathname));
  } catch (error) {
    console.error(error); return json(res, 400, { error: error.message || 'Bad request' });
  }
}).listen(PORT, '0.0.0.0', () => console.log(`Saul's Podship Studio is live on http://0.0.0.0:${PORT}`));
