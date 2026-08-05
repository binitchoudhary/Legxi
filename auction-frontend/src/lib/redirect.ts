/**
 * Validates and sanitizes redirect destination paths.
 * Guarantees that only valid, safe internal application paths are allowed.
 * Rejects external domains, protocol-relative paths, and script injections.
 */
export function getSafeRedirectUrl(
  target: string | null | undefined,
  fallback = '/'
): string {
  if (!target || typeof target !== 'string') {
    return fallback;
  }

  const trimmed = target.trim();

  // Reject unsafe URI schemes
  if (/^(?:javascript|data|vbscript|blob|file):/i.test(trimmed)) {
    return fallback;
  }

  // Reject protocol-relative URLs (//example.com) and backslash evasion
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('\\\\') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('\\/')
  ) {
    return fallback;
  }

  // Must strictly begin with a single forward slash
  if (!trimmed.startsWith('/')) {
    return fallback;
  }

  // Validate using URL parser against internal dummy origin
  try {
    const dummyOrigin = 'https://legxi.internal';
    const parsed = new URL(trimmed, dummyOrigin);

    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }

    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
