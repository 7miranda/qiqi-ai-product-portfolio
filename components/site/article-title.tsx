import StaggeredText from "@/components/react-bits/staggered-text";

type ArticleTitleProps = {
  desktopTitle: string;
  mobileTitle: string;
  mobileAccentLines?: number;
};

function TitleVariant({
  text,
  className,
  accentLines = 1,
}: {
  text: string;
  className: string;
  accentLines?: number;
}) {
  const lines = text.replaceAll("AI Skill", "AI\u00a0Skill").split(/\r?\n/);
  const lead = lines.slice(0, -accentLines).join("\n");
  const accent = lines.slice(-accentLines).join("\n");

  return (
    <span className={className} aria-hidden="true">
      {lead && <StaggeredText as="span" text={lead} segmentBy="lines" className="insight-title-group" direction="bottom" delay={38} duration={0.78} blur />}
      <StaggeredText as="span" text={accent} segmentBy="lines" className="insight-title-group insight-title-group-accent" direction="bottom" delay={38} duration={0.78} blur />
    </span>
  );
}

export default function ArticleTitle({ desktopTitle, mobileTitle, mobileAccentLines = 1 }: ArticleTitleProps) {
  return (
    <h1 className="insight-title" aria-label={desktopTitle.replace(/\r?\n/g, " ")}>
      <TitleVariant text={desktopTitle} className="insight-title-desktop" />
      <TitleVariant text={mobileTitle} className="insight-title-mobile" accentLines={mobileAccentLines} />
    </h1>
  );
}
