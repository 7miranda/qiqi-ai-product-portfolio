"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/lib/project-data";

const HOME_TITLES: Record<string, string> = {
  "bingo-coze": "星辰维度 · 学习与内容生产系统",
  "persona-agent": "狠人思维模型 · 人格化成长 Agent",
  "enterprise-agent": "招商银行 · 经营辅助 Agent",
  "iot-platform": "鸿泉物联网 · 车联网多端系统",
  "government-knowledge": "益电工 · 服务履约与网校协同",
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
            <span className="floor-metric"><strong>{project.metric}{project.metricUnit ? <em>{project.metricUnit}</em> : null}</strong><small>{project.metricLabel}</small></span>
            <ArrowUpRight />
          </Link>
        );
      })}
    </div>
  );
}
