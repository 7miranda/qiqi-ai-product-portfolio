"use client";

export interface ToolItem { name: string; mark: string; }
export interface About5Props { rowOne: ToolItem[]; rowTwo: ToolItem[]; }

function ToolRow({ items, reverse }: { items: ToolItem[]; reverse?: boolean }) {
  const repeated = [...items, ...items];
  return (
    <div className="tool-marquee-window">
      <div className={`tool-marquee-track ${reverse ? "tool-marquee-reverse" : ""}`}>
        {repeated.map((tool, index) => <span className="tool-chip" key={`${tool.name}-${index}`}><i>{tool.mark}</i><strong>{tool.name}</strong></span>)}
      </div>
    </div>
  );
}

export default function About5({ rowOne, rowTwo }: About5Props) {
  return <div className="tool-marquee"><ToolRow items={rowOne} /><ToolRow items={rowTwo} reverse /></div>;
}
