// Public navigation only. No tokens, room IDs, keys or authority cross products.
export function patternsCommercialLinks(value, { development = false } = {}) {
  try {
    const url = new URL(value);
    const local = development === true && url.protocol === 'http:'
      && ['localhost', '127.0.0.1'].includes(url.hostname);
    if ((!local && url.protocol !== 'https:') || url.username || url.password
      || url.search || url.hash || url.pathname !== '/' || url.origin !== value) return null;
    return Object.freeze({ demo: url.origin + '/?startDemo=1',
      license: url.origin + '/license', institutional: url.origin + '/institutional' });
  } catch { return null; }
}
