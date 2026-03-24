import type { PreferenceProfile } from '../types';

/**
 * Build a text block from a preference profile for injection into AI calls.
 * Returns empty string if there's nothing to inject.
 */
export function buildPreferenceBlock(profile: PreferenceProfile | undefined): string {
  if (!profile) return '';

  const lines: string[] = [];
  const hasApproved = profile.approvedStyles.length > 0;
  const hasRejected = profile.rejectedStyles.length > 0;
  const hasCorrections = profile.userCorrections.length > 0;

  if (!hasApproved && !hasRejected && !hasCorrections) return '';

  lines.push('[Learned Style Preferences]');

  if (hasApproved) {
    lines.push(`✓ Preferred: ${profile.approvedStyles.slice(0, 10).join(', ')}`);
  }

  if (hasRejected) {
    lines.push(`✗ Avoid: ${profile.rejectedStyles.slice(0, 10).join(', ')}`);
  }

  if (hasCorrections) {
    const recent = profile.userCorrections.slice(-3);
    lines.push(`! Recent directions: ${recent.map(c => `"${c}"`).join(', ')}`);
  }

  return lines.join('\n');
}
