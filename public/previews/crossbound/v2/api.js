// Only same-origin endpoints: never send collected contacts to a configured third party.
export function apiPath(endpoint) {
  const base = globalThis.CROSSBOUND_API_BASE || '/api';
  if (!/^\/(?!\/)[A-Za-z0-9_/-]*\/api$/.test(base) && base !== '/api') throw Error('Invalid API base');
  return `${base}/${endpoint}`;
}
