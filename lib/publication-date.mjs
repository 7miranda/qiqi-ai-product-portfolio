/** Resolve one build date in the site's publication timezone. */
export function getPublicationDate(now = new Date(), override) {
  if (override !== undefined) {
    const parsed = new Date(`${override}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)
      || Number.isNaN(parsed.getTime())
      || parsed.toISOString().slice(0, 10) !== override) {
      throw new Error("INSIGHTS_BUILD_DATE must be a valid YYYY-MM-DD date");
    }
    return override;
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
