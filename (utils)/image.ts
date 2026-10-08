// One place to build image URLs. Uploaded files are served by the backend
// at its host root (/uploads/...), not under /api, so the base is
// EXPO_PUBLIC_IMAGE_URL, or EXPO_PUBLIC_API_URL without its /api suffix.
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();

export const IMAGE_BASE_URL = (
  (process.env.EXPO_PUBLIC_IMAGE_URL || '').trim() || apiUrl.replace(/\/api\/?$/, '')
).replace(/\/+$/, '');

// "uploads\product_images\a.webp" -> "http://host:5000/uploads/product_images/a.webp"
export const getImageUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  const normalized = path.trim().replace(/\\/g, '/');
  if (!normalized) return undefined;
  if (/^(https?:|data:|file:)/i.test(normalized)) return normalized;
  return `${IMAGE_BASE_URL}/${normalized.replace(/^\/+/, '')}`;
};

// Older name used across the screens
export const normalizeImagePath = getImageUrl;
