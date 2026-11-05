/**
 * Parses the TRUST_PROXY setting for express's `trust proxy`.
 *
 * Express only reads X-Forwarded-For (and so reports the real client in `req.ip`) when told which proxies to
 * trust. Behind Traefik set TRUST_PROXY=1 (one proxy hop). Leaving it unset is correct when clients connect
 * directly, and the header is then ignored so it cannot be spoofed.
 *
 *   unset, "", "false"  -> false (trust nothing)
 *   "true"              -> true  (trust every hop; only safe if the app is unreachable except through the proxy)
 *   "1", "2", ...       -> number of proxy hops
 *   anything else       -> passed through (e.g. "loopback", "10.0.0.0/8")
 */
export const parseTrustProxy = (value?: string): boolean | number | string => {
  const v = value?.trim();
  if (!v || v.toLowerCase() === 'false') return false;
  if (v.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(v)) return parseInt(v, 10);
  return v;
};
