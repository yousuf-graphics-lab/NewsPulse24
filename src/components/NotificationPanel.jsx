import { Bell, CheckCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function NotificationPanel({ onClose }) {
  const { notifications, markAllRead, unreadCount } = useApp();

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="w-[330px] overflow-hidden rounded-[8px] border border-line bg-ink-850/95 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:w-[360px]"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-pulse" />
          <h2 className="text-[12px] font-bold uppercase tracking-[0.14em] text-bone">
            Notifications
          </h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-pulse px-1.5 py-px text-[9.5px] font-bold text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="flex items-center gap-1 text-[10.5px] font-semibold text-muted transition-colors hover:text-pulse"
        >
          <CheckCheck className="h-3 w-3" /> Mark all read
        </button>
      </div>
      <ul className="max-h-[340px] divide-y divide-line/70 overflow-y-auto">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`relative px-4 py-3 transition-colors hover:bg-white/[0.03] ${
              n.unread ? 'bg-pulse/[0.045]' : ''
            }`}
          >
            {n.unread && (
              <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-pulse shadow-[0_0_8px_rgba(255,16,36,0.9)]" />
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-pulse">
                {n.type}
              </span>
              <span className="text-[10px] text-muted">{n.time}</span>
            </div>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug text-bone">{n.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{n.body}</p>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="w-full border-t border-line bg-ink-800/70 py-2.5 text-[11px] font-semibold text-bone/80 transition-colors hover:text-white"
      >
        Close notifications
      </button>
    </div>
  );
}
