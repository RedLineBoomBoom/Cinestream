/**
 * Cinestream Security Utilities
 * Provides input sanitization, safe URL handling, password strength validation,
 * RFC-compliant email checking, and client-side brute-force protection.
 */

/**
 * Validates and sanitizes URLs to strictly allow only safe protocols (https:, http:, or relative paths).
 * Disallows javascript:, data:, vbscript:, file:, and control characters that lead to XSS.
 */
export function sanitizeUrl(url: string | null | undefined, fallback = '#'): string {
  if (!url || typeof url !== 'string') return fallback;

  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Disallow control characters or newlines
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  // Allow relative internal paths (e.g. /movie/123, /watched)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    // Strictly allow only http and https protocols
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // Malformed URL
    return fallback;
  }

  return fallback;
}

/**
 * Strips HTML tags, script delimiters, and clamps length to prevent payload inflation attacks.
 */
export function sanitizeText(input: string | null | undefined, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .slice(0, maxLength)
    .trim();
}

/**
 * Standard RFC-compliant email validation regex.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Enforces strong password requirements:
 * - Minimum 8 characters
 * - At least one number or special symbol
 */
export function validatePassword(password: string, language: 'id' | 'en' = 'id'): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: language === 'en' ? 'Password is required.' : 'Password wajib diisi.',
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: language === 'en'
        ? 'Password must be at least 8 characters long.'
        : 'Password harus terdiri dari minimal 8 karakter.',
    };
  }

  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasNumberOrSymbol) {
    return {
      isValid: false,
      message: language === 'en'
        ? 'Password must contain at least one number or symbol.'
        : 'Password harus mengandung setidaknya satu angka atau simbol.',
    };
  }

  return { isValid: true };
}

interface RateLimitRecord {
  count: number;
  firstAttemptTime: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

/**
 * In-memory sliding rate limiter for sensitive client-side actions (e.g. login attempts).
 * Automatically locks action if maxAttempts is exceeded within windowMs.
 */
export function checkRateLimit(
  actionKey: string,
  maxAttempts = 5,
  windowMs = 30000,
  lockoutMs = 30000
): RateLimitStatus {
  const now = Date.now();
  const record = rateLimitStore.get(actionKey);

  if (!record) {
    rateLimitStore.set(actionKey, { count: 1, firstAttemptTime: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  // Check if currently locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  // Check if window has expired
  if (now - record.firstAttemptTime > windowMs) {
    rateLimitStore.set(actionKey, { count: 1, firstAttemptTime: now });
    return { allowed: true, remainingAttempts: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  // Increment attempts within window
  record.count += 1;

  if (record.count > maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    const retryAfter = Math.ceil(lockoutMs / 1000);
    return { allowed: false, remainingAttempts: 0, retryAfterSeconds: retryAfter };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, maxAttempts - record.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Resets rate limit for an action upon successful authentication.
 */
export function resetRateLimit(actionKey: string): void {
  rateLimitStore.delete(actionKey);
}
