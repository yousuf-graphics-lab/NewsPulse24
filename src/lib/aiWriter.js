/**
 * Client side of the optional rewrite pass.
 *
 * The panel never holds a model key. It asks this deployment's own
 * `/api/write` endpoint whether a key is configured, and if so sends the
 * extracted source text for a rewrite. Everything degrades gracefully: with no
 * key, no network, or a bad model response, the agent keeps the extracted
 * report it already built.
 */
import { read, write } from './db';

export const DEFAULT_ENDPOINT = '/api/write';

export const aiSettings = () => {
  try {
    return read().automation.ai || { enabled: false, endpoint: DEFAULT_ENDPOINT, maxPerRun: 2 };
  } catch {
    return { enabled: false, endpoint: DEFAULT_ENDPOINT, maxPerRun: 2 };
  }
};

/** GET the endpoint and report what it says about its own configuration. */
export const aiStatus = async (endpoint = aiSettings().endpoint) => {
  try {
    const response = await fetch(endpoint, { headers: { accept: 'application/json' }, cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { reachable: false, configured: false, error: payload.error || `HTTP ${response.status}` };
    return {
      reachable: true,
      configured: Boolean(payload.configured),
      provider: payload.provider || '',
      model: payload.model || '',
      note: payload.note || '',
    };
  } catch (error) {
    return { reachable: false, configured: false, error: error.message || 'endpoint unreachable' };
  }
};

const plainText = (draft) =>
  (draft.body || [])
    .map((block) => (block.type === 'list' ? (block.items || []).join(' ') : block.text || ''))
    .join('\n\n')
    .slice(0, 22_000);

/**
 * Sends one draft to the model and returns a rewritten draft, or null when the
 * pass is unavailable or the answer does not survive validation.
 */
export const rewriteDraft = async (draft, { endpoint = aiSettings().endpoint } = {}) => {
  const text = plainText(draft);
  if (text.length < 400) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: draft.title,
        source: draft.attribution?.name || '',
        url: draft.attribution?.url || '',
        section: draft.category,
        text,
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) return null;

    const body = (payload.body || []).filter((block) => (block.text || '').length > 40);
    if (body.length < 2) return null;

    const headline = String(payload.headline || draft.title).slice(0, 140);
    const standfirst = String(payload.standfirst || draft.excerpt).slice(0, 300);
    const words = body.map((block) => block.text || '').join(' ').split(/\s+/).filter(Boolean).length;

    return {
      ...draft,
      title: headline,
      excerpt: standfirst,
      body,
      category: payload.section || draft.category,
      tags: payload.tags?.length ? payload.tags : draft.tags,
      seo: {
        title: (payload.seoTitle || headline).slice(0, 60),
        description: (payload.seoDescription || standfirst).slice(0, 155),
        keywords: payload.tags?.length ? payload.tags : draft.seo?.keywords || [],
      },
      readMinutes: Math.max(1, Math.ceil(words / 200)),
      written: 'model',
      wordCount: words,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/** Rewrites a queued item in place and records the result on the entry. */
export const rewriteQueueItem = async (id, { endpoint } = {}) => {
  const entry = read().automation.queue.find((item) => item.id === id);
  if (!entry) return { ok: false, reason: 'missing' };

  const rewritten = await rewriteDraft(entry.draft, { endpoint });
  if (!rewritten) return { ok: false, reason: 'unavailable' };

  write((state) => ({
    ...state,
    automation: {
      ...state.automation,
      queue: state.automation.queue.map((item) =>
        item.id === id
          ? { ...item, draft: rewritten, score: Math.max(item.score, 80), rewrittenAt: new Date().toISOString() }
          : item,
      ),
    },
  }));
  return { ok: true };
};
