// Vercel Serverless Function: POST /api/generate-script
// Add OPENROUTER_API_KEY (and optionally OPENROUTER_MODEL) in Vercel Project Settings → Environment Variables.

function clean(value, fallback = '') {
  return String(value || fallback).replace(/[<>]/g, '').slice(0, 900);
}
function fallbackScript(project) {
  const title = clean(project.title, 'This Bible story');
  const passage = clean(project.passage, 'the supplied passage');
  return {
    hook: `What does ${title} reveal when we slow down and read ${passage}?`,
    thesis: `${title} invites viewers to follow the source passage carefully and reflect on its message.`,
    narration: [
      { section: 'Hook', seconds: 0, text: `Here is the story of ${title}.` },
      { section: 'Context', seconds: 8, text: 'Begin with the setting, the people, and the tension in the passage.' },
      { section: 'Story', seconds: 24, text: 'Walk through the key movement carefully, allowing Scripture to lead the account.' },
      { section: 'Meaning', seconds: 52, text: 'Notice what this text reveals about God and the faithful response it calls forth.' },
      { section: 'Response', seconds: 74, text: 'Read the source passage for yourself and continue the conversation with care.' }
    ],
    theologicalReview: 'Human editor: verify claims, context, citations, translation attribution, and denominational framing before publishing.'
  };
}
function parseModelJson(content) {
  const text = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const begin = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (begin === -1 || end < begin) throw new Error('Model did not return a JSON object.');
  return JSON.parse(text.slice(begin, end + 1));
}
function normaliseScript(value, project) {
  const fallback = fallbackScript(project);
  const sections = ['Hook', 'Context', 'Story', 'Meaning', 'Response', 'Closing'];
  const narration = Array.isArray(value?.narration) ? value.narration.slice(0, 8).map((part, index) => ({
    section: clean(part?.section, sections[index] || 'Narration'),
    seconds: Math.max(0, Number(part?.seconds ?? index * 15)),
    text: clean(part?.text, fallback.narration[Math.min(index, fallback.narration.length - 1)].text)
  })).filter(part => part.text) : fallback.narration;
  return {
    hook: clean(value?.hook, fallback.hook),
    thesis: clean(value?.thesis, fallback.thesis),
    narration: narration.length ? narration : fallback.narration,
    theologicalReview: clean(value?.theologicalReview, fallback.theologicalReview)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }
  const project = req.body || {};
  if (!process.env.OPENROUTER_API_KEY) {
    // The Studio still works in no-key mode. Returning the fallback prevents a broken production brief.
    return res.status(200).json({ mode: 'local-draft', script: fallbackScript(project) });
  }

  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const system = [
    'You are the script editor for Saul’s Podship, a rigorous Christian theological media project.',
    'Create a concise, reverent video script grounded in the supplied source passage.',
    'Do not invent events, dialogue, historical details, quotations, or certainty where the passage does not provide them.',
    'Do not reproduce Bible translation text. Refer viewers to the source passage instead.',
    'Return JSON only with exactly: hook, thesis, narration, theologicalReview.',
    'narration must be an array of 5 to 8 objects in this form: {section, seconds, text}.',
    'theologicalReview must require human verification of claims, context, citations, and denominational framing before publication.'
  ].join(' ');
  const brief = {
    title: clean(project.title, 'Untitled production'),
    sourcePassage: clean(project.passage, 'No passage supplied'),
    type: project.type === 'general' ? 'general theological content' : 'Bible story',
    format: project.format === 'landscape' ? '16:9 YouTube' : '9:16 Reel / Short',
    targetDurationSeconds: Number(project.duration || 75),
    template: clean(project.template, 'Split-screen presenter'),
    audienceOutcome: clean(project.objective, 'Teach clearly and invite viewers to read Scripture.'),
    archiveContext: project.archiveIdea ? {
      collection: clean(project.archiveIdea.collection, 'Saul’s Podship Theological Archive'),
      question: clean(project.archiveIdea.title, project.title),
      shortAnswer: clean(project.archiveIdea.answer, ''),
      editorialNote: clean(project.archiveIdea.note, ''),
      sourceUrl: clean(project.archiveIdea.source, '')
    } : null
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': "Saul's Podship Studio",
        ...(process.env.APP_URL ? { 'HTTP-Referer': process.env.APP_URL } : {})
      },
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: 1400,
        messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(brief) }]
      })
    });
    if (!response.ok) throw new Error(`OpenRouter returned ${response.status}: ${(await response.text()).slice(0, 220)}`);
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    const text = Array.isArray(content) ? content.map(part => part?.text || '').join('') : content;
    return res.status(200).json({ mode: 'openrouter', model, script: normaliseScript(parseModelJson(text), brief) });
  } catch (error) {
    // A rate-limited free model should never block the user from creating/editing a draft.
    return res.status(200).json({ mode: 'local-draft', warning: error.message, script: fallbackScript(brief) });
  }
}
