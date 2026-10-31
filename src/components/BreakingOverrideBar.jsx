import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Radio, X } from 'lucide-react';
import { getOverride, getVersion, subscribe } from '../lib/contentStore';
import { EASE } from '../lib/motion';

const TONES = {
  alert: 'from-[#B00E1D] via-pulse to-[#B00E1D]',
  developing: 'from-[#8A5A00] via-amber-500 to-[#8A5A00]',
  update: 'from-[#23242C] via-[#2F313C] to-[#23242C]',
};

/**
 * The emergency alert bar the control room can transmit site-wide.
 * Reads the override from the database and follows live changes.
 */
export default function BreakingOverrideBar() {
  const { pathname } = useLocation();
  const [version, setVersion] = useState(() => getVersion());
  const [dismissed, setDismissed] = useState(null);

  useEffect(() => subscribe(() => setVersion(getVersion())), []);

  if (pathname === '/admin') return null;
  const override = getOverride();
  const visible = override && dismissed !== override.headline;

  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          key="override"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE }}
          className="relative z-40 overflow-hidden"
        >
          <div
            className={`bg-gradient-to-r ${TONES[override.tone] || TONES.alert} text-white`}
            role="status"
            aria-live="polite"
          >
            <div className="container-news flex items-center gap-2.5 py-1.5">
              <span className="flex shrink-0 items-center gap-1.5 rounded-[2px] bg-black/25 px-1.5 py-[3px]">
                <Radio className="h-3 w-3 animate-pulseDot" />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em]">
                  {override.kicker || 'Breaking'}
                </span>
              </span>
              <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold sm:text-[12.5px]">
                {override.headline}
              </p>
              {override.slug ? (
                <Link
                  to={`/article/${override.slug}`}
                  className="hidden shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] underline-offset-4 hover:underline sm:flex"
                >
                  Full story <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setDismissed(override.headline)}
                aria-label="Dismiss the breaking alert"
                className="grid h-5 w-5 shrink-0 place-items-center rounded-[2px] bg-black/20 transition-colors hover:bg-black/40"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
