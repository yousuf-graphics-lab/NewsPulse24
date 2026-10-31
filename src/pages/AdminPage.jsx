import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  CircleDot,
  Gauge,
  KeyRound,
  LogOut,
  Menu,
  Newspaper,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import Seo from '../components/Seo';
import AdminLogin from '../components/admin/AdminLogin';
import AdminDashboard from '../components/admin/AdminDashboard';
import PostsTable from '../components/admin/PostsTable';
import PostEditor from '../components/admin/PostEditor';
import SettingsPanel from '../components/admin/SettingsPanel';
import SecurityPanel from '../components/admin/SecurityPanel';
import { useApp } from '../context/AppContext';
import { clearAuditLog, recordAudit } from '../lib/auditLog';
import {
  createSession,
  endSession,
  readSession,
  touchSession,
} from '../lib/adminAuth';
import {
  allPosts,
  deletePost,
  getVersion,
  setPostStatus,
  subscribe,
} from '../lib/contentStore';

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: Gauge },
  { id: 'stories', label: 'Stories', icon: Newspaper },
  { id: 'settings', label: 'Homepage', icon: Settings },
  { id: 'security', label: 'Security', icon: ShieldCheck },
];

export default function AdminPage() {
  const { pushToast } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'dashboard';
  const [session, setSession] = useState(() => readSession());
  const [version, setVersion] = useState(() => getVersion());
  const [editing, setEditing] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
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

  const notify = useCallback(
    (message, tone = 'default') => pushToast(message, tone),
    [pushToast],
  );

  const goTab = (next) => {
    setEditing(null);
    setNavOpen(false);
    setParams(next === 'dashboard' ? {} : { tab: next });
  };

  const signIn = () => {
    const fresh = createSession();
    setSession(fresh);
    recordAudit('Signed in to the control room', 'Session started');
    notify('Control room unlocked', 'success');
  };

  const signOut = () => {
    recordAudit('Signed out');
    endSession();
    setSession(null);
    setEditing(null);
  };

  /* ---------------------------------------------------------- actions */

  const openInStories = () => {
    setNavOpen(false);
    setParams({ tab: 'stories' });
  };

  const editPost = (id) => {
    const post = allPosts().find((p) => p.id === id);
    if (!post) return;
    openInStories();
    setEditing({ post });
  };

  const newPost = () => {
    openInStories();
    setEditing({ post: null });
  };

  const changeStatus = (post, status) => {
    setPostStatus(post.id, status);
    recordAudit(
      status === 'published' ? 'Published story' : 'Unpublished story',
      post.title,
    );
    notify(status === 'published' ? 'Story published' : 'Story moved to drafts', 'success');
  };

  const removePost = (post) => {
    const isBase = post.isBase;
    const message = isBase
      ? `Take “${post.title}” down from the site? You can restore it later.`
      : `Delete “${post.title}” permanently? This cannot be undone.`;
    if (!window.confirm(message)) return;
    deletePost(post.id);
    recordAudit(isBase ? 'Took story down' : 'Deleted story', post.title);
    notify(isBase ? 'Story taken down — restorable from the list' : 'Story deleted', 'success');
  };

  /* ------------------------------------------------------------ render */

  const sessionLeft = session ? Math.max(0, session.expiresAt - clock) : 0;
  const mm = Math.floor(sessionLeft / 60000);
  const ss = String(Math.floor((sessionLeft % 60000) / 1000)).padStart(2, '0');

  const header = editing ? (editing.post ? 'Edit story' : 'New story') : TABS.find((item) => item.id === tab)?.label || 'Overview';

  const seo = (
    <Seo
      title="Editorial control room"
      description="NewsPulse 24 editorial control room."
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

  return (
    <>
      {seo}
      <div className="border-b border-line bg-ink-900/70">
        <div className="container-news flex items-center gap-3 py-2.5">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={navOpen ? 'Close admin navigation' : 'Open admin navigation'}
            aria-expanded={navOpen}
            className="grid h-8 w-8 place-items-center rounded-[5px] border border-line-soft bg-ink-800 text-muted lg:hidden"
          >
            {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-pulse">
            <CircleDot className="h-3 w-3 animate-pulseDot" /> Control room
          </span>
          <span className="hidden text-[11px] text-muted sm:inline">
            / {header}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[10px] font-semibold sm:flex ${
                mm < 2
                  ? 'border-pulse/40 bg-pulse/[0.1] text-pulse-400'
                  : 'border-line-soft bg-ink-800 text-muted'
              }`}
              title="Session time remaining"
            >
              <KeyRound className="h-3 w-3" /> {mm}:{ss}
            </span>
            <Link
              to="/"
              className="flex items-center gap-1 rounded-[4px] border border-line-soft bg-ink-800 px-2 py-1 text-[10.5px] font-semibold text-bone/85 transition-colors hover:border-pulse/50 hover:text-white"
            >
              View site <ArrowUpRight className="h-3 w-3" />
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-1 rounded-[4px] px-2 py-1 text-[10.5px] font-semibold text-muted transition-colors hover:text-pulse"
            >
              <LogOut className="h-3 w-3" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="container-news py-4">
        <div className="grid gap-4 lg:grid-cols-[188px_1fr] [&>*]:min-w-0">
          <nav
            aria-label="Admin sections"
            className={`${navOpen ? 'block' : 'hidden'} lg:block`}
          >
            <ul className="space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = !editing && tab === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => goTab(id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex w-full items-center gap-2 rounded-[6px] border px-3 py-2 text-left text-[12px] font-semibold transition-colors ${
                        active
                          ? 'border-pulse/45 bg-pulse/[0.12] text-white'
                          : 'border-transparent text-muted hover:bg-white/[0.03] hover:text-bone'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 rounded-[6px] border border-line bg-ink-850/60 px-3 py-2.5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted/80">
                Editor on duty
              </p>
              <p className="mt-1 text-[11.5px] font-semibold text-bone/90">Clash Of Clans</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted/70">
                Local publisher access · this browser
              </p>
            </div>
          </nav>

          <div className="min-w-0">
            {editing ? (
              <PostEditor
                key={editing.post?.id || 'new'}
                postId={editing.post?.id}
                initial={editing.post}
                notify={notify}
                onDone={(status) => {
                  if (status) {
                    recordAudit(
                      status === 'published' ? 'Saved & published story' : 'Saved draft',
                      editing.post?.title || 'Untitled',
                    );
                  }
                  setEditing(null);
                }}
              />
            ) : tab === 'stories' ? (
              <PostsTable
                version={version}
                onEdit={editPost}
                onNew={newPost}
                onStatus={changeStatus}
                onDelete={removePost}
                onRestore={() => setVersion(getVersion())}
                notify={notify}
              />
            ) : tab === 'settings' ? (
              <SettingsPanel
                version={version}
                notify={notify}
                onChanged={() => setVersion(getVersion())}
              />
            ) : tab === 'security' ? (
              <SecurityPanel session={session} notify={notify} onSignedOut={signOut} />
            ) : (
              <AdminDashboard
                version={version}
                onEdit={editPost}
                onClearAudit={() => {
                  clearAuditLog();
                  notify('Activity log cleared', 'success');
                  setVersion(getVersion());
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
