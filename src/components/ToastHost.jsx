import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ICONS = {
  success: CheckCircle2,
  info: Info,
  error: XCircle,
};

export default function ToastHost() {
  const { toasts, tickerDock } = useApp();

  return (
    <div
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 z-[90] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2 transition-[bottom] duration-300 ${
        tickerDock === 'bottom' ? 'bottom-[56px]' : 'bottom-4'
      }`}
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone] || Info;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex w-full items-start gap-2.5 rounded-[6px] border border-line bg-ink-800/95 px-3 py-2.5 shadow-[0_24px_50px_-24px_rgba(0,0,0,1)] backdrop-blur-xl"
            >
              <Icon
                className={`mt-[1px] h-4 w-4 shrink-0 ${
                  t.tone === 'success' ? 'text-emerald-400' : 'text-pulse'
                }`}
              />
              <p className="text-[11.5px] leading-relaxed text-bone/90">{t.message}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
