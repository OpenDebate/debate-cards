import { mkdir, readFile, writeFile } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';

const CACHE_DIR = path.join(process.env.CACHE_PATH || './cache', 'api');
const CACHE_ENABLED = process.env.API_CACHE_ENABLED !== 'false'; // Enabled by default

/**
 * Generate a cache key from the request URI
 */
function getCacheKey(uri: string): string {
  const hash = createHash('md5').update(uri).digest('hex');
  return `${hash}.json`;
}

/**
 * Get cached response if it exists
 */
export async function getCachedResponse(uri: string): Promise<any | null> {
  if (!CACHE_ENABLED) return null;

  try {
    const cacheFile = path.join(CACHE_DIR, getCacheKey(uri));
    const cached = await readFile(cacheFile, 'utf-8');
    const data = JSON.parse(cached);
    console.log(`[API Cache] HIT: ${uri}`);
    return data;
  } catch {
    return null;
  }
}

/**
 * Store response in cache
 */
export async function setCachedResponse(uri: string, response: any): Promise<void> {
  if (!CACHE_ENABLED) return;

  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const cacheFile = path.join(CACHE_DIR, getCacheKey(uri));
    await writeFile(cacheFile, JSON.stringify(response, null, 2));
    console.log(`[API Cache] STORE: ${uri}`);
  } catch (err) {
    console.warn(`[API Cache] Failed to store cache for ${uri}:`, err.message);
  }
}


/**
 * Clear all cached API responses
 */
export async function clearApiCache(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
    console.log('[API Cache] Cleared all cached responses');
  } catch (err) {
    console.warn('[API Cache] Failed to clear cache:', err.message);
  }
}
