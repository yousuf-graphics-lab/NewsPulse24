import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Image as ImageIcon,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { AUTHORS, CATEGORIES } from '../../data/news';
import { savePost, slugTaken } from '../../lib/contentStore';
import { Button, Card, Field, PanelHeading, Select, TextArea, TextInput, Toggle, cx } from './ui';

const IMAGES = [
  'hero-earth.jpg',
  'summit.jpg',
  'markets.jpg',
  'ai-robot.jpg',
  'robot-hand.jpg',
  'rocket.jpg',
  'medical.jpg',
  'live-studio.jpg',
  'football.jpg',
  'capitol.jpg',
];

const BLOCK_TYPES = [
  { id: 'p', label: 'Paragraph' },
  { id: 'h2', label: 'Subheading' },
  { id: 'quote', label: 'Pull quote' },
  { id: 'list', label: 'Bullet list' },
];

const BLANK = {
  id: '',
  slug: '',
  category: 'World',
  title: '',
  excerpt: '',
  image: '/images/hero-earth.jpg',
  imageAlt: '',
  imagePosition: 'center 45%',
  publishedAt: '',
  author: AUTHORS.marcus,
  authorKey: 'marcus',
  readMinutes: 4,
  views: 0,
  tags: [],
  hero: false,
  heroKicker: '',
  status: 'draft',
  body: [{ type: 'p', text: '' }],
};

const slugify = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);

const countWords = (blocks) =>
  blocks
    .map((block) => (block.type === 'list' ? (block.items || []).join(' ') : block.text || ''))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

const authorKeyFor = (author) =>
  Object.keys(AUTHORS).find((key) => AUTHORS[key].name === author?.name) || 'marcus';

export default function PostEditor({ postId, initial, onDone, notify }) {
  const source = useMemo(() => initial || null, [initial]);
  const [form, setForm] = useState(() => {
    if (!source) {
      return {
        ...BLANK,
        id: `np-${Date.now().toString(36)}`,
        publishedAt: new Date().toISOString(),
      };
    }
    return {
      ...BLANK,
      ...source,
      authorKey: authorKeyFor(source.author),
      tags: source.tags || [],
      body: source.body?.length ? source.body : [{ type: 'p', text: '' }],
      isBase: source.isBase,
    };
  });
  const [tagText, setTagText] = useState(() => (source?.tags || []).join(', '));
  const [errors, setErrors] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const slugTouched = useRef(!!source?.slug);

  const set = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  };

  const setTitle = (title) => {
    const patch = { title };
    if (!slugTouched.current) patch.slug = slugify(title);
    set(patch);
  };

  const setBody = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      body: prev.body.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    }));
    setDirty(true);
  };

  const addBlock = (after) => {
    setForm((prev) => {
      const next = [...prev.body];
      next.splice(after + 1, 0, { type: 'p', text: '' });
      return { ...prev, body: next };
    });
    setDirty(true);
  };

  const removeBlock = (index) => {
    setForm((prev) => ({
      ...prev,
      body: prev.body.length > 1 ? prev.body.filter((_, i) => i !== index) : prev.body,
    }));
    setDirty(true);
  };

  const moveBlock = (index, direction) => {
    setForm((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.body.length) return prev;
      const next = [...prev.body];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, body: next };
    });
    setDirty(true);
  };

  const words = countWords(form.body);

  const validate = (status) => {
    const next = {};
    if (form.title.trim().length < 8) next.title = 'Headline needs at least 8 characters.';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      next.slug = 'Use lowercase letters, numbers and single dashes.';
    } else if (slugTaken(form.slug, form.id)) {
      next.slug = 'That URL is already used by another story.';
    }
    if (!CATEGORIES.includes(form.category)) next.category = 'Pick a section from the list.';
    if (!form.image) next.image = 'Choose a lead image.';
    if (!form.imageAlt.trim()) next.imageAlt = 'Describe the image for screen readers and SEO.';
    if (status === 'published') {
      if (form.excerpt.trim().length < 30) next.excerpt = 'Write at least 30 characters of standfirst.';
      if (!words) next.body = 'The story has no body text yet.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = (status) => {
    if (!validate(status)) {
      notify('Some fields still need attention', 'error');
      return;
    }
    const now = new Date().toISOString();
    const record = {
      ...form,
      status,
      tags: form.tags,
      readMinutes: Number(form.readMinutes) || 1,
      views: Number(form.views) || 0,
      publishedAt: status === 'published' ? form.publishedAt || now : form.publishedAt || now,
      updatedAt: now,
      author: AUTHORS[form.authorKey] || AUTHORS.marcus,
      heroKicker: form.hero ? form.heroKicker || form.category : undefined,
    };
    delete record.isBase;
    savePost(record);
    setSavedAt(now);
    setDirty(false);
    notify(status === 'published' ? 'Story published to the site' : 'Draft saved', 'success');
    onDone(status);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onDone(null)}
          className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:text-bone"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All stories
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          {form.status === 'published' ? (
            <Link
              to={`/article/${form.slug}`}
              className="flex h-8 items-center gap-1.5 rounded-[5px] border border-line-soft bg-ink-800 px-2.5 text-[11.5px] font-semibold text-bone/85 transition-colors hover:border-pulse/50 hover:text-white"
            >
              View live
            </Link>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => persist('draft')}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </Button>
          <Button size="sm" variant="primary" onClick={() => persist('published')}>
            <Send className="h-3.5 w-3.5" /> {form.status === 'published' ? 'Update live' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card>
            <PanelHeading
              title={source ? 'Edit story' : 'New story'}
              description={
                dirty
                  ? 'Unsaved changes'
                  : savedAt
                    ? `Saved ${new Date(savedAt).toLocaleTimeString('en-GB')}`
                    : 'Draft'
              }
              action={
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  {words} words · {form.readMinutes} min read
                </span>
              }
            />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <Field label="Headline" htmlFor="post-title" error={errors.title}>
                <TextInput
                  id="post-title"
                  value={form.title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What happened, in one line"
                  invalid={!!errors.title}
                  maxLength={140}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="URL slug"
                  htmlFor="post-slug"
                  error={errors.slug}
                  hint={`/article/${form.slug || 'your-story'}`}
                >
                  <TextInput
                    id="post-slug"
                    value={form.slug}
                    onChange={(e) => {
                      slugTouched.current = true;
                      set({ slug: slugify(e.target.value) });
                    }}
                    placeholder="your-story"
                    invalid={!!errors.slug}
                  />
                </Field>
                <Field label="Section" htmlFor="post-category" error={errors.category}>
                  <Select
                    id="post-category"
                    value={form.category}
                    onChange={(e) => set({ category: e.target.value })}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field
                label="Standfirst"
                htmlFor="post-excerpt"
                error={errors.excerpt}
                hint="One or two sentences shown under the headline and in search results."
              >
                <TextArea
                  id="post-excerpt"
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => set({ excerpt: e.target.value })}
                  placeholder="Why this story matters"
                  invalid={!!errors.excerpt}
                />
              </Field>

              <Field
                label="Tags"
                htmlFor="post-tags"
                hint={`Comma separated. Used for search and SEO keywords. ${form.tags.length}/8`}
              >
                <TextInput
                  id="post-tags"
                  value={tagText}
                  onChange={(e) => {
                    // Keep the raw text so separators are not eaten mid-typing.
                    setTagText(e.target.value);
                    set({
                      tags: e.target.value
                        .split(',')
                        .map((tag) => tag.trim().toLowerCase())
                        .filter(Boolean)
                        .slice(0, 8),
                    });
                  }}
                  placeholder="markets, central banks, inflation"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <PanelHeading
              title="Story body"
              description="Blocks render in order on the article page."
              action={<span className="text-[10.5px] text-muted">{form.body.length} blocks</span>}
            />
            <div className="space-y-2.5 px-4 py-4 sm:px-5">
              {errors.body ? (
                <p className="text-[11px] font-medium text-pulse-400">{errors.body}</p>
              ) : null}
              {form.body.map((block, index) => (
                <div key={index} className="rounded-[6px] border border-line-soft bg-ink-950/50 p-2.5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted/70">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Select
                      aria-label={`Block ${index + 1} type`}
                      value={block.type}
                      onChange={(e) => setBody(index, { type: e.target.value })}
                      className="h-7 w-[132px] text-[11px]"
                    >
                      {BLOCK_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                    <div className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        aria-label="Move block up"
                        className="grid h-6 w-6 place-items-center rounded text-muted transition-colors hover:text-bone disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === form.body.length - 1}
                        aria-label="Move block down"
                        className="grid h-6 w-6 place-items-center rounded text-muted transition-colors hover:text-bone disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBlock(index)}
                        aria-label="Remove block"
                        className="grid h-6 w-6 place-items-center rounded text-muted transition-colors hover:text-pulse"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {block.type === 'list' ? (
                    <TextArea
                      rows={3}
                      value={(block.items || []).join('\n')}
                      onChange={(e) =>
                        setBody(index, {
                          items: e.target.value.split('\n').map((line) => line.trim()).filter(Boolean),
                        })
                      }
                      placeholder={'One bullet per line'}
                    />
                  ) : (
                    <TextArea
                      rows={block.type === 'p' ? 3 : 2}
                      value={block.text || ''}
                      onChange={(e) => setBody(index, { text: e.target.value })}
                      placeholder={
                        block.type === 'h2'
                          ? 'Subheading'
                          : block.type === 'quote'
                            ? 'Quoted words'
                            : 'Write the paragraph'
                      }
                    />
                  )}

                  {block.type === 'quote' ? (
                    <TextInput
                      className="mt-1.5 h-8 text-[11.5px]"
                      value={block.cite || ''}
                      onChange={(e) => setBody(index, { cite: e.target.value })}
                      placeholder="Attribution — who said it"
                      aria-label="Quote attribution"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => addBlock(index)}
                    className="mt-2 flex items-center gap-1 text-[10.5px] font-semibold text-muted transition-colors hover:text-pulse"
                  >
                    <Plus className="h-3 w-3" /> Add block below
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addBlock(form.body.length - 1)}>
                <Plus className="h-3.5 w-3.5" /> Add block
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <PanelHeading title="Lead image" />
            <div className="px-4 py-4 sm:px-5">
              <img
                src={form.image}
                alt=""
                className="h-32 w-full rounded-[6px] border border-line object-cover"
                style={{ objectPosition: form.imagePosition }}
              />
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {IMAGES.map((file) => {
                  const path = `/images/${file}`;
                  const active = form.image === path;
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => set({ image: path })}
                      aria-label={`Use ${file}`}
                      aria-pressed={active}
                      className={cx(
                        'relative overflow-hidden rounded-[4px] border transition-all',
                        active ? 'border-pulse ring-1 ring-pulse/50' : 'border-line hover:border-line-soft',
                      )}
                    >
                      <img src={path} alt="" loading="lazy" className="h-9 w-full object-cover" />
                      {active ? (
                        <span className="absolute inset-0 grid place-items-center bg-ink-950/50">
                          <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {errors.image ? (
                <p className="mt-1 text-[11px] font-medium text-pulse-400">{errors.image}</p>
              ) : null}

              <Field label="Image description" htmlFor="post-image-alt" error={errors.imageAlt} className="mt-3">
                <TextInput
                  id="post-image-alt"
                  value={form.imageAlt}
                  onChange={(e) => set({ imageAlt: e.target.value })}
                  placeholder="Describe what the photo shows"
                  invalid={!!errors.imageAlt}
                />
              </Field>
              <Field label="Focal point" htmlFor="post-image-pos" className="mt-3">
                <Select
                  id="post-image-pos"
                  value={form.imagePosition}
                  onChange={(e) => set({ imagePosition: e.target.value })}
                >
                  <option value="center 30%">Top</option>
                  <option value="center 45%">Upper middle</option>
                  <option value="center 50%">Centre</option>
                  <option value="center 65%">Lower middle</option>
                  <option value="center 80%">Bottom</option>
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <PanelHeading title="Byline & placement" />
            <div className="space-y-3 px-4 py-4 sm:px-5">
              <Field label="Reporter" htmlFor="post-author">
                <Select
                  id="post-author"
                  value={form.authorKey}
                  onChange={(e) => set({ authorKey: e.target.value })}
                >
                  {Object.entries(AUTHORS).map(([key, author]) => (
                    <option key={key} value={key}>
                      {author.name} — {author.role}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Read time (min)" htmlFor="post-read">
                  <TextInput
                    id="post-read"
                    type="number"
                    min="1"
                    max="90"
                    value={form.readMinutes}
                    onChange={(e) => set({ readMinutes: e.target.value })}
                  />
                </Field>
                <Field label="Read counter" htmlFor="post-views" hint="Base figure">
                  <TextInput
                    id="post-views"
                    type="number"
                    min="0"
                    step="100"
                    value={form.views}
                    onChange={(e) => set({ views: e.target.value })}
                  />
                </Field>
              </div>
              <Toggle
                checked={!!form.hero}
                onChange={(hero) => set({ hero })}
                label="Breaking news"
                hint="Adds the story to the hero carousel and the breaking ticker."
              />
              {form.hero ? (
                <Field label="Kicker" htmlFor="post-kicker" hint="Shown above the headline.">
                  <TextInput
                    id="post-kicker"
                    value={form.heroKicker || ''}
                    onChange={(e) => set({ heroKicker: e.target.value })}
                    placeholder={form.category}
                  />
                </Field>
              ) : null}
              <Field label="Publish date" htmlFor="post-date">
                <TextInput
                  id="post-date"
                  type="datetime-local"
                  value={(form.publishedAt || '').slice(0, 16)}
                  onChange={(e) => set({ publishedAt: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          {source?.isBase ? (
            <p className="flex items-start gap-1.5 rounded-[6px] border border-line bg-ink-850/60 px-3 py-2 text-[10.5px] leading-relaxed text-muted">
              <ImageIcon className="mt-[1px] h-3 w-3 shrink-0 text-pulse/80" />
              This is a shipped story. Your edits are layered on top and can be reset from Settings.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
