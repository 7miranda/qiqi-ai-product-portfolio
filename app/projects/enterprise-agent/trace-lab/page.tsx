import type { Metadata } from "next";
import EnterpriseTraceLab from "@/components/site/enterprise-trace-lab";

export const metadata: Metadata = {
  title: "RAG 评测与 Bad Case 归因 · 招商银行 AI 经营助手",
};

export default function TraceLabPage() {
  return <EnterpriseTraceLab />;
}
