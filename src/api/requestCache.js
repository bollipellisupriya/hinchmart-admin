const cache = new Map();
const DEFAULT_TTL = 15000;

if (typeof window !== "undefined") {
  window.addEventListener("hinchmart_data_updated", () => cache.clear());
}

export const cachedRequest = async (key, request, ttl = DEFAULT_TTL) => {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value;

  const value = Promise.resolve().then(request);
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
};

export const invalidateRequest = (key) => cache.delete(key);
