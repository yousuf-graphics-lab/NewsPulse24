import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function SectionHeading({
  title,
  action,
  actionTo = '/',
  onAction,
  right,
  className = '',
  accent = true,
}) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2
        className={`flex items-center text-[13.5px] font-bold uppercase tracking-[0.09em] text-bone ${
          accent ? 'red-bar' : ''
        }`}
      >
        {title}
      </h2>
      {right}
      {action &&
        (onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-pulse transition-colors hover:text-white"
          >
            {action} <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <Link
            to={actionTo}
            className="group flex shrink-0 items-center gap-1 text-[11px] font-semibold text-pulse transition-colors hover:text-white"
          >
            {action}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
    </div>
  );
}
