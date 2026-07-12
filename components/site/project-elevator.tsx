"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/lib/project-data";

const HOME_TITLES: Record<string, string> = {
  "bingo-coze": "AIGC 内容生产 · 增长双引擎",
  "persona-agent": "星辰维度 · 人格化商业 Agent",
  "enterprise-agent": "招商银行 · 高校经营决策 Agent",
  "iot-platform": "车联网 · 多端风控系统",
  "government-knowledge": "益电工 · C 端履约与网校协同",
};

export default function ProjectElevator() {
  const [activeSlug, setActiveSlug] = useState(projects[0].slug);

  return (
    <div className="project-elevator" aria-label="项目楼层">
      {projects.map((project) => {
        const active = activeSlug === project.slug;
        return (
          <Link
            key={project.slug}
            href={`/projects/${project.slug}`}
            className={`project-floor${active ? " is-active" : ""}`}
            aria-current={active ? "true" : undefined}
            onPointerEnter={() => setActiveSlug(project.slug)}
            onFocus={() => setActiveSlug(project.slug)}
          >
            <span className="floor-no">{project.floor}F</span>
            <span className="floor-project"><strong>{HOME_TITLES[project.slug]}</strong></span>
            <span className="floor-metric"><strong>{project.metric}{project.metricUnit ? <em>{project.metricUnit}</em> : null}</strong><small>{project.shortProof}</small></span>
            <ArrowUpRight />
          </Link>
        );
      })}
    </div>
  );
}
