import { useMemo, useState } from 'react';
import { Database, Eraser, Pin, RotateCcw, Save, Trash2 } from 'lucide-react';
import { STORIES, formatCompactViews } from '../../data/news';
import {
  getSettings,
  readContent,
  readCounts,
  resetAllContent,
  resetReads,
  updateSettings,
} from '../../lib/contentStore';
import { Badge, Button, Card, Field, PanelHeading, Select, TextInput } from './ui';

export default function SettingsPanel({ version, notify, onChanged }) {
  const current = useMemo(() => {
    void version;
    return getSettings();
  }, [version]);
  const [heroPins, setHeroPins] = useState(current.heroPins);
  const [tickerPins, setTickerPins] = useState(current.tickerPins);
  const [confirmReset, setConfirmReset] = useState('');
  const [confirmReads, setConfirmReads] = useState(false);

  const options = useMemo(
    () => [...STORIES].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    [version],
  );

  const save = () => {
    updateSettings({ heroPins: heroPins.filter(Boolean), tickerPins: tickerPins.filter(Boolean) });
    notify('Editorial pins saved — the homepage updates now', 'success');
    onChanged();
  };

  const storage = useMemo(() => {
    void version;
    const content = readContent();
    const reads = readCounts();
    const bytes = new Blob([JSON.stringify(content)]).size;
    return {
      posts: content.posts.length,
      hidden: content.hidden.length,
      bytes,
      reads: Object.values(reads).reduce((sum, n) => sum + n, 0),
      updatedAt: content.updatedAt,
      views: STORIES.reduce((sum, s) => sum + (s.views || 0), 0),
    };
  }, [version]);

  const setPin = (list, setList, index, value) => {
    const next = [...list];
    next[index] = value;
    setList(next.filter((slug, i) => slug || i < list.length));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr] [&>*]:min-w-0">
      <div className="space-y-4">
        <Card>
          <PanelHeading
            title="Homepage hero"
            description="Pin up to three stories to the hero carousel, in order. Empty slots fall back to the newest breaking stories."
            action={<Pin className="h-3.5 w-3.5 text-muted" />}
          />
          <div className="space-y-2.5 px-4 py-4 sm:px-5">
            {[0, 1, 2].map((index) => (
              <Field key={index} label={`Slide ${index + 1}`} htmlFor={`hero-pin-${index}`}>
                <Select
                  id={`hero-pin-${index}`}
                  value={heroPins[index] || ''}
                  onChange={(e) => setPin(heroPins, setHeroPins, index, e.target.value)}
                >
                  <option value="">Automatic</option>
                  {options.map((story) => (
                    <option key={story.id} value={story.slug}>
                      {story.category} — {story.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
        </Card>

        <Card>
          <PanelHeading
            title="Breaking ticker"
            description="Pin up to four headlines to the top of the ticker. Unfilled slots rotate through breaking and most-read stories."
            action={<Pin className="h-3.5 w-3.5 text-muted" />}
          />
          <div className="space-y-2.5 px-4 py-4 sm:px-5">
            {[0, 1, 2, 3].map((index) => (
              <Field key={index} label={`Headline ${index + 1}`} htmlFor={`ticker-pin-${index}`}>
                <Select
                  id={`ticker-pin-${index}`}
                  value={tickerPins[index] || ''}
                  onChange={(e) => setPin(tickerPins, setTickerPins, index, e.target.value)}
                >
                  <option value="">Automatic</option>
                  {options.map((story) => (
                    <option key={story.id} value={story.slug}>
                      {story.category} — {story.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
          <div className="border-t border-line px-4 py-3 sm:px-5">
            <Button variant="primary" size="sm" onClick={save}>
              <Save className="h-3.5 w-3.5" /> Save pins
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <PanelHeading title="Stored content" description="Everything the panel keeps in this browser." />
          <dl className="divide-y divide-line/70 text-[11.5px]">
            {[
              ['Edited / new stories', storage.posts],
              ['Taken-down stories', storage.hidden],
              ['Reads logged here', storage.reads],
              ['Total read counter', formatCompactViews(storage.views)],
              ['Storage used', `${(storage.bytes / 1024).toFixed(1)} kB`],
              [
                'Last change',
                storage.updatedAt ? new Date(storage.updatedAt).toLocaleString('en-GB') : 'Never',
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
                <dt className="text-muted">{label}</dt>
                <dd className="font-semibold text-bone/90">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="border-pulse/25">
          <PanelHeading
            title="Reset"
            description="Destructive actions — they cannot be undone."
            action={<Badge tone="red">Careful</Badge>}
          />
          <div className="space-y-4 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[11.5px] leading-relaxed text-muted">
                Delete every edit, draft and takedown, restoring the shipped newsroom.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <TextInput
                  value={confirmReset}
                  onChange={(e) => setConfirmReset(e.target.value)}
                  placeholder="Type RESET to confirm"
                  aria-label="Type RESET to confirm content reset"
                  className="h-9 flex-1"
                />
                <Button
                  variant="danger"
                  size="sm"
                  disabled={confirmReset !== 'RESET'}
                  onClick={() => {
                    resetAllContent();
                    setConfirmReset('');
                    setHeroPins([]);
                    setTickerPins([]);
                    notify('All local content restored to the shipped newsroom', 'success');
                    onChanged();
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset content
                </Button>
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <p className="text-[11.5px] leading-relaxed text-muted">
                Clear the per-browser read counters used by the dashboard.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-[11.5px] text-bone/85">
                  <input
                    type="checkbox"
                    checked={confirmReads}
                    onChange={(e) => setConfirmReads(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#FF1024]"
                  />
                  I understand counters reset to zero
                </label>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={!confirmReads}
                  onClick={() => {
                    resetReads();
                    setConfirmReads(false);
                    notify('Read counters cleared', 'success');
                    onChanged();
                  }}
                >
                  <Eraser className="h-3.5 w-3.5" /> Clear counters
                </Button>
              </div>
            </div>

            <p className="flex items-start gap-1.5 border-t border-line pt-3 text-[10.5px] leading-relaxed text-muted/80">
              <Database className="mt-[1px] h-3 w-3 shrink-0 text-pulse/70" />
              Content lives in this browser only. Export before clearing your site data if you need to
              keep a story.
            </p>
            <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-muted/80">
              <Trash2 className="mt-[1px] h-3 w-3 shrink-0 text-pulse/70" />
              Clearing site data in your browser settings also clears stories.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
