/**
 * Append-only audit trail for admin actions. Stored locally, capped at 80
 * entries, newest first. No secrets are ever written here.
 */
const AUDIT_KEY = 'newspulse24:admin:audit';
const LIMIT = 80;

const read = () => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUDIT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const auditLog = () => read();

export const recordAudit = (action, detail = '') => {
  if (typeof window === 'undefined') return [];
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    action,
    detail,
  };
  const next = [entry, ...read()].slice(0, LIMIT);
  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — the action still succeeded */
  }
  return next;
};

export const clearAuditLog = () => {
  if (typeof window === 'undefined') return [];
  try {
    window.localStorage.removeItem(AUDIT_KEY);
  } catch {
    /* ignore */
  }
  return [];
};
