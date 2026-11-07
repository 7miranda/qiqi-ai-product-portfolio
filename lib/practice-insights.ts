import type { InsightArticle } from "./october-insights";
import contentA from "./practice-content-a.json";
import contentB from "./practice-content-b.json";
import contentC from "./practice-content-c.json";

export const practiceInsights: InsightArticle[] = [...contentA, ...contentB, ...contentC];
