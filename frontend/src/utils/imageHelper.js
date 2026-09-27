/**
 * Unified helper to resolve image URLs across Arz-Mart.
 * Uses GitHub Raw CDN for static upload files when deployed serverless.
 */

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/husseinmasarra/arz-market/main/backend';
const DEFAULT_PLACEHOLDER = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80';

export function getImageUrl(url, fallback = DEFAULT_PLACEHOLDER) {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (trimmed.length === 0) return fallback;

  // External absolute URLs or inline base64
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Uploads directory path
  if (trimmed.startsWith('/uploads/')) {
    return `${GITHUB_RAW_BASE}${trimmed}`;
  }

  // Other root-relative paths like /logo.png
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Bare filenames like '03-075-073.webp'
  return `${GITHUB_RAW_BASE}/uploads/products/${trimmed}`;
}

export function handleImageError(e, fallback = DEFAULT_PLACEHOLDER) {
  if (e?.currentTarget && e.currentTarget.src !== fallback) {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallback;
  }
}
