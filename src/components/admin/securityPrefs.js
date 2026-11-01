/** Shared storage key for the auto-lock-on-tab-hide preference. */
export const LOCK_ON_HIDE_KEY = 'newspulse24:admin:lock-on-hide';
export const LOCK_ON_HIDE_AFTER_MS = 2 * 60 * 1000;

export const lockOnHideEnabled = () => {
  try {
    return window.localStorage.getItem(LOCK_ON_HIDE_KEY) !== '0';
  } catch {
    return true;
  }
};
