import { octoberInsights } from "./october-insights";
import { practiceInsights } from "./practice-insights";
import { getPublicationDate } from "./publication-date.mjs";

// Resolve once per build so the index and every generated detail route agree.
const publicationDate = getPublicationDate(new Date(), process.env.INSIGHTS_BUILD_DATE);

export const publishedInsights = [...octoberInsights, ...practiceInsights]
  .filter((article) => article.date <= publicationDate)
  .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
