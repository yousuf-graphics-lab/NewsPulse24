import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ExternalLink,
  Flame,
  Image as ImageIcon,
  ListPlus,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { AUTHORS, CATEGORIES } from '../../data/news';
import { publish, draftSave, slugTaken } from '../../lib/contentStore';
import {
  Button,
  Card,
  Field,
  IconButton,
  MicroLabel,
  SectionHead,
  Select,
  Tag,
  TextArea,
  TextInput,
  Toggle,
  cx,
} from './ui';

const IMAGES = [
  ['hero-earth.jpg', 'Connected world'],
  ['summit.jpg', 'Summit hall'],
  ['markets.jpg', 'Market floor'],
  ['ai-robot.jpg', 'Humanoid robot'],
  ['robot-hand.jpg', 'Robot hand'],
  ['rocket.jpg', 'Launch'],
  ['medical.jpg', 'Clinical lab'],
  ['live-studio.jpg', 'Live studio'],
  ['football.jpg', 'Stadium'],
  ['capitol.jpg', 'Capitol'],
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

const localNow = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export default function StoryEditor({ postId, initial, onDone, notify }) {
  const source = useMemo(() => initial || null, [initial]);
  const titleRef = useRef(null);
  const [form, setForm] = useState(() => {
    if (!source) {
      return {
        ...BLANK,
        id: `np-${Date.now().toString(36)}`,
        publishedAt: localNow(),
      };
    }
    return {
      ...BLANK,
      ...source,
      authorKey: authorKeyFor(source.author),
      tags: source.tags || [],
      body: source.body?.length ? source.body : [{ type: 'p', text: '' }],
      publishedAt: source.publishedAt
        ? (() => {
            const date = new Date(source.publishedAt);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            return date.toISOString().slice(0, 16);
          })()
        : localNow(),
      isBase: source.isBase,
    };
  });
  const [tagText, setTagText] = useState(() => (source?.tags || []).join(', '));
  const [errors, setErrors] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const slugTouched = useRef(!!source?.slug);

  useEffect(() => {
    if (!source) titleRef.current?.focus();
  }, [source]);

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
    setErrors((prev) => ({ ...prev, body: undefined }));
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
      id: form.id,
      status,
      tags: form.tags,
      readMinutes: Number(form.readMinutes) || 1,
      views: Number(form.views) || 0,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : now,
      updatedAt: now,
      author: AUTHORS[form.authorKey] || AUTHORS.marcus,
      heroKicker: form.hero ? form.heroKicker || form.category : undefined,
    };
    delete record.isBase;
    delete record.authorKey;
    const result = status === 'published' ? publish(record) : draftSave(record);
    if (result && result.ok === false) {
      notify('Browser storage is full — export a backup, then clear old telemetry.', 'error');
      return;
    }
    setForm((prev) => ({ ...prev, status }));
    setSavedAt(now);
    setDirty(false);
    notify(status === 'published' ? 'Story published to the site' : 'Draft saved', 'success');
    onDone(status, record);
  };

  const leave = () => {
    if (dirty && !window.confirm('Discard unsaved changes to this story?')) return;
    onDone(null);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === 's') {
        event.preventDefault();
        persist('draft');
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        persist('published');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const live = form.status === 'published';

  const checks = [
    { id: 'headline', label: 'Headline', hint: 'At least 8 characters', ok: form.title.trim().length >= 8 },
    { id: 'standfirst', label: 'Standfirst', hint: 'At least 30 characters', ok: form.excerpt.trim().length >= 30 },
    {
      id: 'slug',
      label: 'URL slug',
      hint: 'Unique and dash-separated',
      ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) && !slugTaken(form.slug, form.id),
    },
    { id: 'image', label: 'Image description', hint: 'Alt text for readers and SEO', ok: !!form.imageAlt.trim() },
    { id: 'body', label: 'Story body', hint: 'At least one paragraph of copy', ok: words >= 25 },
    { id: 'tags', label: 'Tags', hint: 'Improves related stories', ok: form.tags.length > 0 },
  ];

  return (
    <div className="space-y-3">
      {/* editor toolbar */}
      <Card className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={leave}
          className="flex h-7 items-center gap-1.5 rounded-[4px] border border-[#262832] bg-[#101116] px-2 text-[10.5px] font-semibold text-[#9A9CAA] transition-colors hover:border-[#3A3C46] hover:text-bone"
        >
          <ArrowLeft className="h-3 w-3" /> Ledger
        </button>

        <span className="flex items-center gap-1.5">
          <MicroLabel tone="red">{source ? 'Editing' : 'New dispatch'}</MicroLabel>
          <span className="h-3 w-px bg-[#2A2C36]" />
          <span className="text-[10.5px] font-semibold text-bone/80">
            {form.title?.trim() ? form.title.slice(0, 54) : 'Untitled story'}
          </span>
        </span>

        <Tag tone={form.status === 'published' ? 'green' : 'muted'}>
          {form.status === 'published' ? 'Live' : 'Draft'}
        </Tag>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="hidden items-center gap-1.5 text-[10px] text-[#6F7180] sm:flex">
            {dirty ? (
              <>
                <AlertTriangle className="h-3 w-3 text-amber-400/80" /> Unsaved changes
              </>
            ) : savedAt ? (
              <>
                <Check className="h-3 w-3 text-emerald-400/80" /> Saved{' '}
                {new Date(savedAt).toLocaleTimeString('en-GB', { hour12: false })}
              </>
            ) : (
              <>Nothing stored yet</>
            )}
          </span>
          {live ? (
            <Link
              to={`/article/${form.slug}`}
              className="flex h-7 items-center gap-1 rounded-[4px] border border-[#262832] bg-[#101116] px-2 text-[10.5px] font-semibold text-bone/80 transition-colors hover:border-pulse/50 hover:text-white"
            >
              <ExternalLink className="h-3 w-3" /> View live
            </Link>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => persist('draft')}>
            <Save className="h-3 w-3" /> Save draft
          </Button>
          <Button variant="primary" size="sm" onClick={() => persist('published')}>
            <Send className="h-3 w-3" /> {live ? 'Update live' : 'Publish story'}
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* copy */}
        <div className="space-y-3">
          <Card>
            <SectionHead
              title="Headline & standfirst"
              description="The first 90 characters carry the front page — keep it concrete."
              action={<MicroLabel>{form.title.length}/140</MicroLabel>}
            />
            <div className="space-y-3 px-3.5 py-3">
              <Field label="Headline" htmlFor="post-title" error={errors.title}>
                <TextArea
                  id="post-title"
                  ref={titleRef}
                  rows={2}
                  value={form.title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="What happened, in one line"
                  invalid={!!errors.title}
                  maxLength={140}
                  className="text-[15px] font-bold leading-snug"
                />
              </Field>

              <Field
                label="Standfirst"
                htmlFor="post-excerpt"
                error={errors.excerpt}
                hint="Shown under the headline, on cards and in search results."
              >
                <TextArea
                  id="post-excerpt"
                  rows={2}
                  value={form.excerpt}
                  onChange={(event) => set({ excerpt: event.target.value })}
                  placeholder="Why this story matters, in one or two sentences."
                  invalid={!!errors.excerpt}
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
                    onChange={(event) => {
                      slugTouched.current = true;
                      set({ slug: slugify(event.target.value) });
                    }}
                    placeholder="your-story"
                    invalid={!!errors.slug}
                    className="font-mono text-[11px]"
                  />
                </Field>
                <Field label="Section" htmlFor="post-category" error={errors.category}>
                  <Select
                    id="post-category"
                    value={form.category}
                    onChange={(event) => set({ category: event.target.value })}
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
                label="Tags"
                htmlFor="post-tags"
                hint={`Comma separated, used for related stories and SEO keywords. ${form.tags.length}/8`}
              >
                <TextInput
                  id="post-tags"
                  value={tagText}
                  onChange={(event) => {
                    setTagText(event.target.value);
                    set({
                      tags: event.target.value
                        .split(',')
                        .map((tag) => tag.trim().toLowerCase())
                        .filter(Boolean)
                        .slice(0, 8),
                    });
                  }}
                  placeholder="markets, central banks, inflation"
                />
              </Field>

              {form.tags.length ? (
                <div className="flex flex-wrap gap-1">
                  {form.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionHead
              title="Story body"
              description="Blocks render in this order on the article page."
              action={
                <div className="flex items-center gap-2">
                  <MicroLabel>
                    {form.body.length} blocks · {words} words
                  </MicroLabel>
                  <Button variant="ghost" size="xs" onClick={() => addBlock(form.body.length - 1)}>
                    <ListPlus className="h-3 w-3" /> Add
                  </Button>
                </div>
              }
            />
            <div className="space-y-2 px-3.5 py-3">
              {errors.body ? (
                <p className="flex items-center gap-1.5 text-[10.5px] font-medium text-pulse-400">
                  <AlertTriangle className="h-3 w-3" /> {errors.body}
                </p>
              ) : null}

              {form.body.map((block, index) => (
                <div key={index} className="rounded-[4px] border border-[#22232A] bg-[#0A0B0F] p-2">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="w-4 font-mono text-[9px] text-[#5F616E]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <Select
                      aria-label={`Block ${index + 1} type`}
                      value={block.type}
                      onChange={(event) => setBody(index, { type: event.target.value })}
                      className="h-6 w-[124px] text-[10.5px]"
                    >
                      {BLOCK_TYPES.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                    <div className="ml-auto flex items-center gap-0.5">
                      <IconButton
                        label="Move block up"
                        onClick={() => moveBlock(index, -1)}
                        disabled={index === 0}
                        className="h-6 w-6 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </IconButton>
                      <IconButton
                        label="Move block down"
                        onClick={() => moveBlock(index, 1)}
                        disabled={index === form.body.length - 1}
                        className="h-6 w-6 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </IconButton>
                      <IconButton
                        label="Remove block"
                        onClick={() => removeBlock(index)}
                        className="h-6 w-6 hover:text-pulse"
                      >
                        <X className="h-3 w-3" />
                      </IconButton>
                    </div>
                  </div>

                  {block.type === 'list' ? (
                    <TextArea
                      rows={3}
                      value={(block.items || []).join('\n')}
                      onChange={(event) =>
                        setBody(index, {
                          items: event.target.value
                            .split('\n')
                            .map((line) => line.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="One bullet per line"
                    />
                  ) : (
                    <TextArea
                      rows={block.type === 'p' ? 3 : 2}
                      value={block.text || ''}
                      onChange={(event) => setBody(index, { text: event.target.value })}
                      placeholder={
                        block.type === 'h2'
                          ? 'Subheading'
                          : block.type === 'quote'
                            ? 'Quoted words'
                            : 'Write the paragraph'
                      }
                      className={cx(block.type === 'h2' && 'font-bold', block.type === 'quote' && 'italic')}
                    />
                  )}

                  {block.type === 'quote' ? (
                    <TextInput
                      className="mt-1.5 h-7 text-[11px]"
                      value={block.cite || ''}
                      onChange={(event) => setBody(index, { cite: event.target.value })}
                      placeholder="Attribution — who said it"
                      aria-label="Quote attribution"
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => addBlock(index)}
                    className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[#6F7180] transition-colors hover:text-pulse"
                  >
                    <Plus className="h-3 w-3" /> Insert block below
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHead
              title="Publish readiness"
              description="The gates the publish action checks before a story can go live."
              action={
                <Tag tone={checks.filter((item) => item.ok).length === checks.length ? 'green' : 'amber'}>
                  {checks.filter((item) => item.ok).length}/{checks.length} ready
                </Tag>
              }
            />
            <div className="grid gap-x-4 gap-y-1 px-3.5 py-2.5 sm:grid-cols-2">
              {checks.map((item) => (
                <div key={item.id} className="flex items-start gap-1.5">
                  <span
                    className={cx(
                      'mt-[2px] grid h-3 w-3 shrink-0 place-items-center rounded-full border',
                      item.ok
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-[#3A3C46] text-[#5F616E]',
                    )}
                  >
                    {item.ok ? <Check className="h-2 w-2" strokeWidth={4} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10.5px] font-semibold text-bone/85">{item.label}</span>
                    <span className="block text-[9px] leading-snug text-[#6F7180]">{item.hint}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1D1E25] px-3.5 py-2">
              <p className="text-[9px] uppercase tracking-[0.12em] text-[#5F616E]">
                ⌘S save draft · ⌘↵ publish
              </p>
              <p className="text-[9px] text-[#5F616E]">
                {words} words · {Math.max(1, Math.ceil(words / 220))} min at reading speed
              </p>
            </div>
          </Card>
        </div>

        {/* rail */}
        <div className="space-y-3">
          <Card>
            <SectionHead
              title="Front page preview"
              action={<Tag tone={form.status === 'published' ? 'green' : 'red'}>
                {form.status === 'published' ? 'Live look' : 'Draft look'}
              </Tag>}
            />
            <div className="px-3 py-3">
              <div className="overflow-hidden rounded-[4px] border border-[#262832] bg-[#0A0B0F]">
                <img
                  src={form.image}
                  alt=""
                  className="h-[104px] w-full object-cover"
                  style={{ objectPosition: form.imagePosition }}
                />
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-pulse">
                      {form.hero ? form.heroKicker || 'Breaking' : form.category}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-[#3F414C]" />
                    <span className="text-[8.5px] uppercase tracking-[0.1em] text-[#6F7180]">
                      {form.readMinutes} min read
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-[12.5px] font-bold leading-snug text-bone">
                    {form.title || 'Your headline appears here'}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#8A8C99]">
                    {form.excerpt || 'The standfirst sits under the headline on the front page.'}
                  </p>
                  <p className="mt-1.5 text-[9px] text-[#6F7180]">
                    {AUTHORS[form.authorKey]?.name} · {form.category}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <SectionHead title="Lead image" action={<MicroLabel>{IMAGES.length} in library</MicroLabel>} />
            <div className="space-y-2.5 px-3 py-3">
              <img
                src={form.image}
                alt=""
                className="h-24 w-full rounded-[4px] border border-[#262832] object-cover"
                style={{ objectPosition: form.imagePosition }}
              />
              <div className="grid grid-cols-5 gap-1">
                {IMAGES.map(([file, label]) => {
                  const path = `/images/${file}`;
                  const active = form.image === path;
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => set({ image: path })}
                      aria-label={`Use ${label}`}
                      aria-pressed={active}
                      title={label}
                      className={cx(
                        'relative overflow-hidden rounded-[3px] border transition-colors',
                        active ? 'border-pulse' : 'border-[#22232A] hover:border-[#3A3C46]',
                      )}
                    >
                      <img src={path} alt="" loading="lazy" className="h-8 w-full object-cover" />
                      {active ? (
                        <span className="absolute inset-0 grid place-items-center bg-black/55">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              {errors.image ? <p className="text-[10.5px] text-pulse-400">{errors.image}</p> : null}

              <Field label="Image description" htmlFor="post-image-alt" error={errors.imageAlt}>
                <TextInput
                  id="post-image-alt"
                  value={form.imageAlt}
                  onChange={(event) => set({ imageAlt: event.target.value })}
                  placeholder="Describe what the photo shows"
                  invalid={!!errors.imageAlt}
                />
              </Field>
              <Field label="Focal point" htmlFor="post-image-pos">
                <Select
                  id="post-image-pos"
                  value={form.imagePosition}
                  onChange={(event) => set({ imagePosition: event.target.value })}
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
            <SectionHead title="Byline & distribution" />
            <div className="space-y-2.5 px-3 py-3">
              <Field label="Reporter" htmlFor="post-author">
                <Select
                  id="post-author"
                  value={form.authorKey}
                  onChange={(event) => set({ authorKey: event.target.value })}
                >
                  {Object.entries(AUTHORS).map(([key, author]) => (
                    <option key={key} value={key}>
                      {author.name} — {author.role}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Read time" htmlFor="post-read" hint="Minutes">
                  <TextInput
                    id="post-read"
                    type="number"
                    min="1"
                    max="90"
                    value={form.readMinutes}
                    onChange={(event) => set({ readMinutes: event.target.value })}
                  />
                </Field>
                <Field label="Reads" htmlFor="post-views" hint="Base figure">
                  <TextInput
                    id="post-views"
                    type="number"
                    min="0"
                    step="100"
                    value={form.views}
                    onChange={(event) => set({ views: event.target.value })}
                  />
                </Field>
              </div>
              <Field label="Publish timestamp" htmlFor="post-date">
                <TextInput
                  id="post-date"
                  type="datetime-local"
                  value={form.publishedAt || ''}
                  onChange={(event) => set({ publishedAt: event.target.value })}
                />
              </Field>

              <div className="rounded-[4px] border border-[#262832] bg-[#0A0B0F] px-2.5 py-2">
                <Toggle
                  checked={!!form.hero}
                  onChange={(hero) => set({ hero })}
                  label="Breaking news"
                  hint="Hero carousel, breaking ticker and the alert rail."
                />
                {form.hero ? (
                  <div className="mt-2">
                    <Field label="Kicker" htmlFor="post-kicker" hint="Defaults to the section name.">
                      <TextInput
                        id="post-kicker"
                        value={form.heroKicker || ''}
                        onChange={(event) => set({ heroKicker: event.target.value })}
                        placeholder={form.category}
                      />
                    </Field>
                  </div>
                ) : null}
              </div>

              <Button
                variant="danger"
                size="md"
                className="w-full"
                onClick={() => persist('published')}
              >
                <Flame className="h-3.5 w-3.5" /> {live ? 'Push update live' : 'Publish dispatch'}
              </Button>
            </div>
          </Card>

          {source?.isBase ? (
            <p className="flex items-start gap-1.5 rounded-[4px] border border-[#22232A] bg-[#0E0F14] px-3 py-2 text-[10px] leading-relaxed text-[#7A7C89]">
              <ImageIcon className="mt-[1px] h-3 w-3 shrink-0 text-pulse/80" />
              This is a shipped story. Your edits are layered over the original file and can be reset
              from Settings.
            </p>
          ) : null}

          {source ? (
            <p className="flex items-start gap-1.5 px-1 text-[9.5px] leading-relaxed text-[#5F616E]">
              <Trash2 className="mt-[1px] h-3 w-3 shrink-0" />
              To take this story off the site, use the ledger row actions — it stays restorable.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
