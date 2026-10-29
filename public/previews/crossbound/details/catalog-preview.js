// Reuse the catalog's queued studio render without reading or changing game state.
export function catalogPreview(subscribe, productId) {
  if (typeof subscribe !== 'function') return Promise.resolve(null);
  return new Promise(resolve => {
    let stop = () => {}, settled = false;
    const finish = image => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stop();
      resolve(image);
    };
    const timer = setTimeout(() => finish(null), 4000);
    try {
      stop = subscribe(productId, result => finish(result?.image || null));
      if (settled) stop();
    } catch {
      finish(null);
    }
  });
}
