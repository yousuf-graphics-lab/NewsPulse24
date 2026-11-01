import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  Bot,
  Gauge,
  LayoutGrid,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Tv,
  Users,
} from 'lucide-react';
import Seo from '../components/Seo';
import AdminLogin from '../components/admin/AdminLogin';
import AdminShell from '../components/admin/AdminShell';
import MissionControl from '../components/admin/MissionControl';
import NewsroomLedger from '../components/admin/NewsroomLedger';
import StoryEditor from '../components/admin/StoryEditor';
import LiveDesk from '../components/admin/LiveDesk';
import AnalyticsView from '../components/admin/AnalyticsView';
import StaffView from '../components/admin/StaffView';
import SettingsView from '../components/admin/SettingsView';
import SecurityView from '../components/admin/SecurityView';
import WireAutomation from '../components/admin/WireAutomation';
import { Button, MicroLabel, Tag } from '../components/admin/ui';
import { useApp } from '../context/AppContext';
import {
  broadcastSignOut,
  createSession,
  endSession,
  onRemoteSignOut,
  readSession,
  touchSession,
} from '../lib/adminAuth';
import { LOCK_ON_HIDE_AFTER_MS, lockOnHideEnabled } from '../components/admin/securityPrefs';
import {
  allPosts,
  getSettings,
  getTickerStories,
  getVersion,
  subscribe,
  updateSettings,
} from '../lib/contentStore';
import { logEvent, read as readDb, storageReport } from '../lib/db';
import { markQueuePublished, queueCounts } from '../lib/automation';
import { buildDashboard } from '../lib/telemetry';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'ledger', label: 'Newsroom ledger', icon: LayoutGrid },
  { id: 'drafting', label: 'Drafting room', icon: Plus },
  { id: 'wire', label: 'Wire agent', icon: Bot },
  { id: 'live', label: 'Live TV & breaking', icon: Tv },
  { id: 'analytics', label: 'Analytics & heatmaps', icon: Activity },
  { id: 'staff', label: 'Staff & permissions', icon: Users },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'security', label: 'Security & access', icon: ShieldCheck },
];

const META = {
  dashboard: {
    title: 'Mission control',
    eyebrow: 'Live command',
    subtitle:
      'Readership, breaking surges and the editorial board in one place. Every number is derived from the story dataset or from opens recorded on this device.',
  },
  ledger: {
    title: 'Newsroom ledger',
    eyebrow: 'Editorial ops',
    subtitle: 'Every story on the wire, its status and its read performance. Edit, publish or take down from here.',
  },
  drafting: {
    title: 'Drafting room',
    eyebrow: 'Compose',
    subtitle: 'Write, illustrate and publish to the live site. Drafts stay local until you publish.',
  },
  wire: {
    title: 'Wire agent',
    eyebrow: 'Automation',
    subtitle:
      'A standing agent that reads public feeds, assembles attributed stories with section, tags, SEO and an image, then either queues them for you or publishes on your rules.',
  },
  live: {
    title: 'Live TV & breaking',
    eyebrow: 'Broadcast',
    subtitle: 'The alert bar, ticker rundown and live desk rail — everything that interrupts the front page.',
  },
  analytics: {
    title: 'Analytics & heatmaps',
    eyebrow: 'Telemetry',
    subtitle: 'Where readers are and when they arrive: hourly heatmap, desk split and the story leaderboard.',
  },
  staff: {
    title: 'Staff & permissions',
    eyebrow: 'Roster',
    subtitle: 'Desk assignments and access tiers for the newsroom roster.',
  },
  settings: {
    title: 'Settings',
    eyebrow: 'Configuration',
    subtitle: 'Front page slots, desk weights, backup and the destructive resets.',
  },
  security: {
    title: 'Security & access',
    eyebrow: 'Access control',
    subtitle: 'Rotate the passphrase, inspect the session and read the security trail.',
  },
};

const pad = (value) => String(value).padStart(2, '0');

export default function AdminPage() {
  const { pushToast } = useApp();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') || 'dashboard';
  const tab = NAV.some((item) => item.id === rawTab) ? rawTab : 'dashboard';
  const query = params.get('q') || '';

  const [session, setSession] = useState(() => readSession());
  const [version, setVersion] = useState(() => getVersion());
  const [editing, setEditing] = useState(null);
  const [clock, setClock] = useState(() => Date.now());
  const [range, setRange] = useState('24h');
  const lastTouch = useRef(0);

  useEffect(() => subscribe(() => setVersion(getVersion())), []);

  /* Session keep-alive + auto-lock. */
  useEffect(() => {
    if (!session) return undefined;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastTouch.current < 25_000) return;
      lastTouch.current = now;
      touchSession();
    };
    const tick = window.setInterval(() => {
      setClock(Date.now());
      const live = readSession();
      if (!live) {
        setSession(null);
        setEditing(null);
        pushToast('Session locked after inactivity. Sign in again to continue.');
      }
    }, 5_000);
    window.addEventListener('pointerdown', onActivity);
    window.addEventListener('keydown', onActivity);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [pushToast, session]);

  const notify = useCallback((message, tone = 'default') => pushToast(message, tone), [pushToast]);

  /* Signing out in one tab closes the rest. */
  useEffect(
    () =>
      onRemoteSignOut(() => {
        setSession(null);
        setEditing(null);
        pushToast('Signed out from another tab.');
      }),
    [pushToast],
  );

  /* Optional: leaving the tab for two minutes locks the session. */
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      const away = hiddenAt ? Date.now() - hiddenAt : 0;
      hiddenAt = 0;
      if (!session || !lockOnHideEnabled() || away < LOCK_ON_HIDE_AFTER_MS) return;
      endSession();
      setSession(null);
      setEditing(null);
      pushToast('Locked after two minutes away — enter the passphrase again.');
      logEvent('security', 'Session auto-locked', 'Tab hidden for more than two minutes');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [pushToast, session]);

  const goTab = useCallback(
    (next) => {
      setEditing(null);
      setParams(next === 'dashboard' ? {} : { tab: next });
    },
    [setParams],
  );

  const signIn = () => {
    const fresh = createSession();
    setSession(fresh);
    logEvent('security', 'Signed in to mission control', 'Session started');
    notify('Control room unlocked', 'success');
  };

  const signOut = () => {
    logEvent('security', 'Signed out', 'Session ended by the operator');
    endSession();
    broadcastSignOut();
    setSession(null);
    setEditing(null);
    notify('Signed out of mission control');
  };

  /* ------------------------------------------------------------ actions */

  const editPost = useCallback(
    (id) => {
      const post = allPosts().find((item) => item.id === id);
      if (!post) return;
      setEditing({ post });
      setParams({ tab: 'drafting' });
    },
    [setParams],
  );

  const newPost = useCallback(() => {
    setEditing({ post: null });
    setParams({ tab: 'drafting' });
  }, [setParams]);

  const autoBalance = () => {
    const ranked = [...allPosts().filter((post) => post.status === 'published')].sort(
      (a, b) => (b.views || 0) - (a.views || 0),
    );
    if (!ranked.length) {
      notify('No published stories to balance', 'error');
      return;
    }
    updateSettings({
      heroPins: ranked.slice(0, 3).map((post) => post.slug),
      tickerPins: ranked.slice(3, 7).map((post) => post.slug),
    });
    logEvent('content', 'Slots auto-rebalanced', `${ranked.length} stories ranked by reads`);
    notify('Hero and ticker slots rebalanced by read velocity', 'success');
  };

  /* ------------------------------------------------------------ derived */

  const sessionLeft = session ? Math.max(0, session.expiresAt - clock) : 0;
  const settings = getSettings();
  const ticker = useMemo(() => getTickerStories(), [version]);
  const storage = useMemo(() => storageReport(), [version]);
  const wireCounts = useMemo(() => queueCounts(), [version]);
  const nav = useMemo(
    () =>
      NAV.map((item) =>
        item.id === 'wire' && wireCounts.pending
          ? { ...item, badge: String(wireCounts.pending) }
          : item,
      ),
    [wireCounts.pending],
  );
  const dash = useMemo(() => buildDashboard(range), [range, version]);
  const date = new Date(clock);
  const statusLine = {
    date: `${pad(date.getUTCDate())} ${date
      .toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })
      .toUpperCase()} ${date.getUTCFullYear()} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`,
    latency: `${storage.kb.toFixed(1)} kB · ${dash.kpis.stories} stories`,
    build: `DB v3 · ${settings.autoSync === false ? 'SYNC PAUSED' : 'AUTOSYNC 5S'} · LOCAL NODE`,
  };

  const seo = (
    <Seo
      title="Mission control"
      description="NewsPulse 24 editorial mission control."
      path="/admin"
      noindex
      keywords={[]}
    />
  );

  if (!session) {
    return (
      <>
        {seo}
        <AdminLogin onSuccess={signIn} />
      </>
    );
  }

  const meta = META[tab];
  const headAction =
    tab === 'ledger' ? (
      <Button variant="primary" size="md" onClick={newPost}>
        <Plus className="h-3.5 w-3.5" /> New dispatch
      </Button>
    ) : tab === 'staff' ? (
      <Tag tone="green">
        <span className="h-1 w-1 rounded-full bg-emerald-400" /> Roster synced
      </Tag>
    ) : tab === 'settings' ? (
      <MicroLabel>Schema v2 · {storage.posts} local posts</MicroLabel>
    ) : null;

  return (
    <>
      {seo}
      <AdminShell
        nav={nav}
        activeTab={tab}
        onNavigate={(next) => goTab(next)}
        title={meta.title}
        subtitle={meta.subtitle}
        headEyebrow={meta.eyebrow}
        headAction={headAction}
        onQuickDispatch={newPost}
        onSearch={(term) => setParams(term ? { tab: 'ledger', q: term } : { tab: 'ledger' })}
        preview={settings.override?.headline || ticker.breaking[0]?.title || ''}
        audit={readDb().audit}
        sessionLeft={sessionLeft}
        clock={clock}
        onSignOut={signOut}
        statusLine={statusLine}
      >
        {tab === 'dashboard' ? (
          <MissionControl
            version={version}
            range={range}
            setRange={setRange}
            onGoLedger={() => goTab('ledger')}
            onEdit={editPost}
            onPreview={() => window.open('/', '_blank', 'noopener')}
            onOverride={() => goTab('live')}
            onAutoBalance={autoBalance}
            notify={notify}
          />
        ) : null}

        {tab === 'ledger' ? (
          <NewsroomLedger
            key={query}
            version={version}
            onEdit={editPost}
            onNew={newPost}
            notify={notify}
            initialQuery={query}
          />
        ) : null}

        {tab === 'drafting' ? (
          <StoryEditor
            key={editing?.post?.id || 'new'}
            postId={editing?.post?.id}
            initial={editing?.post || null}
            notify={notify}
            onDone={(status, record) => {
              if (status && record) {
                if (editing?.queueId && status === 'published') {
                  markQueuePublished(editing.queueId, record.slug);
                }
                setEditing({
                  post: { ...record, isBase: editing?.post?.isBase },
                  queueId: editing?.queueId,
                });
              } else if (status === null) {
                setEditing(null);
                setParams({ tab: 'ledger' });
              }
            }}
          />
        ) : null}

        {tab === 'wire' ? (
          <WireAutomation
            version={version}
            notify={notify}
            onEditDraft={(draft, queueId) => {
              setEditing({ post: draft, queueId });
              setParams({ tab: 'drafting' });
            }}
          />
        ) : null}

        {tab === 'live' ? <LiveDesk version={version} notify={notify} /> : null}
        {tab === 'analytics' ? <AnalyticsView version={version} range={range} setRange={setRange} /> : null}
        {tab === 'staff' ? <StaffView version={version} notify={notify} /> : null}
        {tab === 'settings' ? <SettingsView version={version} notify={notify} /> : null}
        {tab === 'security' ? (
          <SecurityView
            session={session}
            version={version}
            notify={notify}
            onSignedOut={signOut}
          />
        ) : null}
      </AdminShell>
    </>
  );
}
