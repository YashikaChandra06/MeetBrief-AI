/**
 * Sanitizes user provided strings to prevent injection, control character abuse,
 * or excessive buffer sizes.
 */
export function sanitizeInput(input?: string | null): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // remove control chars
    .slice(0, 4000); // sensible upper bound
}

/**
 * Sanitizes web snippet content before embedding it into LLM prompts.
 * Defends against prompt injection attempts found on web pages
 * (e.g., "Ignore previous instructions and do X").
 */
export function sanitizeWebContent(content?: string | null): string {
  if (!content) return '';
  let sanitized = content
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
    // neutralizes injection patterns in scraped text
    .replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions/gi, '[neutralized directive]')
    .replace(/system\s*:\s*/gi, 'system note: ')
    .replace(/<\/?(script|iframe|style|object|embed)[^>]*>/gi, '')
    .trim();

  if (sanitized.length > 3000) {
    sanitized = sanitized.slice(0, 3000) + '... [truncated]';
  }
  return sanitized;
}

/**
 * Extracts domain name from URL cleanly
 */
export function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'web source';
  }
}

