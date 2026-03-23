/**
 * Haptic feedback via Web Vibration API (#17)
 * Safe no-op on devices that don't support it (desktop, iOS Safari).
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

function vibrate(pattern: number | number[]) {
  if (canVibrate) {
    try { navigator.vibrate(pattern); } catch (_) { /* ignore */ }
  }
}

/** Light tap — selecting an image, pressing a button */
export const hapticLight = () => vibrate(8);

/** Medium tap — completing an action, adding a note */
export const hapticMedium = () => vibrate(18);

/** Double tap — mode switch, connection created */
export const hapticDouble = () => vibrate([10, 60, 10]);

/** Error — delete confirmation, failed action */
export const hapticError = () => vibrate([20, 40, 20, 40, 60]);

/** Success — project saved, import complete */
export const hapticSuccess = () => vibrate([12, 30, 24]);
