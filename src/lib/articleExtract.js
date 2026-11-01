/**
 * Article extraction.
 *
 * The wire agent can only publish a full report if it can actually read one.
 * Feed items carry a blurb; the report lives on the publisher's page. This
 * module turns that page into editorial blocks — paragraphs, subheadings and
 * quotes — by finding the densest text container and throwing away the chrome
 * around it (navigation, cookie banners, related-story rails, promos).
 *
 * It runs in the browser (DOMParser), never during prerender, and it never
 * touches the network — `automation.js` fetches the HTML through the proxy and
 * hands it over here.
 */

const JUNK_PATTERN =
  /(cookie|consent|subscribe|newsletter|sign up|sign in|advertisement|advert|sponsored|read more|related|most read|follow us|share this|download the app|all rights reserved|copyright|terms of (use|service)|privacy policy|already a subscriber|enable javascript|your browser)/i;

const BYLINE_PATTERN = /^(by|words by|reporting by|written by)\s+[A-Z]/i;

const JAIL_TAGS = [
  'script',
  'style',
  'noscript',
  'template',
  'iframe',
  'form',
  'button',
  'nav',
  'aside',
  'footer',
  'header',
  'svg',
  'canvas',
  'video',
  'audio',
  'select',
  'option',
];

/** Containers publishers actually put the story in, most specific first. */
const CONTENT_SELECTORS = [
  '[itemprop="articleBody"]',
  'article',
  '.article-body',
  '.article__body',
  '.articleBody',
  '.story-body',
  '.story-body__inner',
  '.entry-content',
  '.post-content',
  '.c-entry-content',
  '.dcr-1qbz7oo',
  '.ssrcss-uf6wea-RichTextComponentWrapper',
  '.wysiwyg',
  '.content__article-body',
  '#article-body',
  'main',
];

const BLOCK_TAGS = new Set(['P', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL']);

const textOf = (node) => (node.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const clean = (root) => {
  for (const selector of JAIL_TAGS) {
    for (const node of [...root.querySelectorAll(selector)]) node.remove();
  }
  // Publishers mark the chrome inline as well as in tags.
  for (const node of [...root.querySelectorAll('[aria-hidden="true"], [role="navigation"], [class*="cookie"], [id*="cookie"], [class*="newsletter"], [class*="promo"], [class*="related"], [class*="advert"]')]) {
    node.remove();
  }
};

/** Picks the element that holds the most readable prose. */
const densestContainer = (doc) => {
  let best = null;
  let bestScore = 0;

  for (const selector of CONTENT_SELECTORS) {
    for (const node of doc.querySelectorAll(selector)) {
      let score = 0;
      for (const paragraph of node.querySelectorAll('p')) {
        const text = textOf(paragraph);
        if (text.length > 60 && !JUNK_PATTERN.test(text)) score += text.length;
      }
      // Prefer the inner-most wrapper when scores tie: it has less chrome.
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }
  }

  if (best && bestScore > 400) return best;
  return doc.body || doc.documentElement;
};

const isUsableParagraph = (text) => {
  if (text.length < 70) return false;
  if (JUNK_PATTERN.test(text)) return false;
  if (BYLINE_PATTERN.test(text) && text.length < 120) return false;
  const letters = text.replace(/[^A-Za-z]/g, '').length;
  return letters / text.length > 0.6;
};

const listItems = (element) => {
  const items = [...element.querySelectorAll('li')]
    .map((item) => textOf(item))
    .filter((text) => text.length > 24 && text.length < 220 && !JUNK_PATTERN.test(text));
  return items.slice(0, 6);
};

/**
 * Reads an article page.
 *
 * @returns {{blocks: Array, paragraphs: string[], wordCount: number, image: string, description: string, byline: string}}
 */
export const extractArticle = (html) => {
  const empty = { blocks: [], paragraphs: [], wordCount: 0, image: '', description: '', byline: '' };
  if (typeof DOMParser === 'undefined' || !html) return empty;

  let doc;
  try {
    doc = new DOMParser().parseFromString(String(html), 'text/html');
  } catch {
    return empty;
  }
  if (!doc?.body) return empty;

  const description =
    doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
    '';
  const image =
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
    '';
  const byline =
    textOf(doc.querySelector('[rel="author"], .byline, [class*="byline"], [class*="author"]') || { textContent: '' }) || '';

  clean(doc);
  const container = densestContainer(doc);

  const blocks = [];
  const seen = new Set();

  for (const node of container.querySelectorAll('p, h2, h3, blockquote, ul, ol')) {
    // Skip paragraphs nested inside a block we already read.
    if (blocks.length && node.closest('blockquote') && node.tagName === 'P') continue;

    if (node.tagName === 'UL' || node.tagName === 'OL') {
      const items = listItems(node);
      if (items.length >= 3) {
        const key = items.join('|').slice(0, 80);
        if (!seen.has(key)) {
          seen.add(key);
          blocks.push({ type: 'list', items });
        }
      }
      continue;
    }

    const text = textOf(node);
    if (!text || seen.has(text.slice(0, 80))) continue;

    if (node.tagName === 'H2' || node.tagName === 'H3') {
      if (text.length < 90 && !JUNK_PATTERN.test(text)) {
        seen.add(text.slice(0, 80));
        blocks.push({ type: 'h2', text });
      }
      continue;
    }

    if (node.tagName === 'BLOCKQUOTE') {
      if (text.length > 40 && text.length < 420) {
        seen.add(text.slice(0, 80));
        blocks.push({ type: 'quote', text, cite: '' });
      }
      continue;
    }

    if (isUsableParagraph(text)) {
      seen.add(text.slice(0, 80));
      blocks.push({ type: 'p', text });
    }
  }

  const bodyImage =
    (container.querySelector('img[src]')?.getAttribute('src') || '') ||
    (doc.querySelector('article img[src], figure img[src]')?.getAttribute('src') || '');

  const paragraphs = blocks.filter((block) => block.type === 'p').map((block) => block.text);
  const wordCount = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;

  return {
    blocks,
    paragraphs,
    wordCount,
    image: /^https?:\/\//i.test(bodyImage) ? bodyImage : image,
    description: textOf({ textContent: description }),
    byline,
  };
};

/** True when the page gave us enough to publish as a real report. */
export const hasFullReport = (article) =>
  Boolean(article && article.wordCount >= 150 && article.paragraphs.length >= 3);
