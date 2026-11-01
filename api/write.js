/**
 * Optional language-model pass for the wire agent.
 *
 *   GET  /api/write   → { configured, provider, model, limits }
 *   POST /api/write   → { ok, headline, standfirst, body, tags, section, seo }
 *
 * The agent works without this function: it publishes extracted reports from
 * real feeds. When a key is configured here, the panel can also ask a model to
 * turn a long extract into publication-ready copy — a fresh headline,
 * standfirst and flowing body in house style, with the publisher credited.
 *
 * The key never leaves the server: it is read from the environment, used for
 * one request, and never returned to the browser. Providers are addressed
 * through a single contract so switching is an env change, not a code change.
 *
 *   AI_PROVIDER   openai | anthropic | gemini | compatible   (default: openai)
 *   AI_API_KEY    provider key  (OPENAI_API_KEY / ANTHROPIC_API_KEY /
 *                 GEMINI_API_KEY are also accepted)
 *   AI_MODEL      model id      (sensible default per provider)
 *   AI_BASE_URL   for `compatible` (OpenRouter, Groq, Together, a local LLM…)
 */

const LIMITS = { text: 24_000, headline: 200, timeoutMs: 25_000 };

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map();

const rateLimited = (key) => {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 500) hits.clear();
  return recent.length > MAX_PER_WINDOW;
};

const clamp = (value, max) => String(value || '').slice(0, max).trim();

const readConfig = () => {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  const key =
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';
  const model =
    process.env.AI_MODEL ||
    (provider === 'anthropic'
      ? 'claude-3-5-haiku-latest'
      : provider === 'gemini'
        ? 'gemini-2.0-flash'
        : 'gpt-4o-mini');
  const baseUrl = process.env.AI_BASE_URL || '';
  return { provider: ['openai', 'anthropic', 'gemini', 'compatible'].includes(provider) ? provider : 'openai', key, model, baseUrl };
};

const SYSTEM_PROMPT = `You are the duty editor on NewsPulse 24, an international news desk.

You are given the headline, publisher and full text of a news report. Write a
clean, factual newsroom rewrite for publication.

Rules:
- Neutral wire-service English. Straight reporting, no hype, no filler.
- Never invent facts, numbers, quotes or names that are not in the source.
- Keep the publisher's reporting credited in the body ("according to").
- No AI tells: no "in a world where", "delve", "it remains to be seen",
  "let's", "here's the thing", "the landscape of", no rhetorical questions,
  no closing summary paragraph addressed to the reader.
- Vary sentence length. Prefer concrete nouns and active verbs.
- Do not add a byline, dateline, disclaimer or markdown.

Reply with JSON only, in exactly this shape:
{
  "headline": "sentence-case headline, max 90 characters, no outlet suffix",
  "standfirst": "one sentence, 90-200 characters, adds context rather than repeating the headline",
  "body": ["paragraph", "paragraph", ...],
  "section": "one of World, Business, Technology, Science, Health, Sports, Entertainment, Lifestyle, Opinion",
  "tags": ["3-6 lowercase tags"],
  "seoTitle": "max 60 characters",
  "seoDescription": "max 155 characters"
}
Write 4 to 8 paragraphs. Each paragraph is plain text; no subheadings inside
the array unless you start an entry with "## " to mark a subheading.`;

const userPrompt = ({ title, source, url, text, section }) =>
  [
    `Publisher: ${source || 'the wire'}`,
    url ? `Original: ${url}` : '',
    section ? `Desk hint: ${section}` : '',
    `Headline: ${title}`,
    '',
    'Full text of the report:',
    text,
  ]
    .filter(Boolean)
    .join('\n');

const postJson = async (url, body, headers = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITS.timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error?.message || payload?.error || `provider responded ${response.status}`;
      throw new Error(String(message).slice(0, 200));
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
};

const callProvider = async (config, prompts) => {
  const { provider, key, model, baseUrl } = config;

  if (provider === 'anthropic') {
    const payload = await postJson(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: 2000,
        system: prompts.system,
        messages: [{ role: 'user', content: prompts.user }],
      },
      { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    );
    return (payload.content || []).map((part) => part.text || '').join('');
  }

  if (provider === 'gemini') {
    const payload = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        systemInstruction: { parts: [{ text: prompts.system }] },
        contents: [{ role: 'user', parts: [{ text: prompts.user }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      },
    );
    return (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('');
  }

  const endpoint =
    provider === 'compatible' && baseUrl
      ? `${baseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

  const payload = await postJson(
    endpoint,
    {
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user', content: prompts.user },
      ],
    },
    { authorization: `Bearer ${key}` },
  );
  return payload.choices?.[0]?.message?.content || '';
};

const parseModelJson = (raw) => {
  const text = String(raw || '').trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('the model did not return JSON');
  return JSON.parse(candidate.slice(start, end + 1));
};

const SECTIONS = ['World', 'Business', 'Technology', 'Science', 'Health', 'Sports', 'Entertainment', 'Lifestyle', 'Opinion'];

const normalise = (data, fallback) => {
  const body = (Array.isArray(data.body) ? data.body : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .map((entry) => (entry.startsWith('## ') ? { type: 'h2', text: entry.slice(3).trim() } : { type: 'p', text: entry }))
    .slice(0, 14);

  return {
    headline: clamp(data.headline, LIMITS.headline) || fallback.title,
    standfirst: clamp(data.standfirst, 400),
    body,
    section: SECTIONS.includes(data.section) ? data.section : fallback.section,
    tags: (Array.isArray(data.tags) ? data.tags : [])
      .map((tag) => String(tag || '').toLowerCase().trim())
      .filter((tag) => tag && tag.length < 30)
      .slice(0, 6),
    seoTitle: clamp(data.seoTitle, 60),
    seoDescription: clamp(data.seoDescription, 155),
  };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const config = readConfig();

  if (req.method === 'GET') {
    res.status(200).json({
      configured: Boolean(config.key),
      provider: config.provider,
      model: config.model,
      note: config.key
        ? 'A key is configured on the server. The browser never sees it.'
        : 'No key configured. The agent still publishes extracted reports; add AI_API_KEY to enable rewriting.',
      limits: LIMITS,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'GET or POST only' });
    return;
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (rateLimited(ip)) {
    res.status(429).json({ error: 'Too many rewrite requests — try again in a minute' });
    return;
  }

  if (!config.key) {
    res.status(503).json({
      error: 'No AI key configured on this deployment',
      hint: 'Set AI_API_KEY (and optionally AI_PROVIDER, AI_MODEL) in the hosting environment.',
    });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const title = clamp(body.title, LIMITS.headline);
  const text = clamp(body.text, LIMITS.text);
  if (!title || text.length < 200) {
    res.status(400).json({ error: 'Send a title and at least 200 characters of source text' });
    return;
  }

  const fallback = { title, section: SECTIONS.includes(body.section) ? body.section : 'World' };

  try {
    const raw = await callProvider(config, {
      system: SYSTEM_PROMPT,
      user: userPrompt({
        title,
        source: clamp(body.source, 120),
        url: clamp(body.url, 500),
        section: fallback.section,
        text,
      }),
    });
    const parsed = normalise(parseModelJson(raw), fallback);
    if (!parsed.body.length) throw new Error('the model returned an empty body');

    res.status(200).json({ ok: true, ...parsed, provider: config.provider, model: config.model });
  } catch (error) {
    const message = String(error?.message || error);
    const timedOut = /abort/i.test(message);
    res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'The model timed out — try a shorter report' : message.slice(0, 300),
      provider: config.provider,
    });
  }
}
