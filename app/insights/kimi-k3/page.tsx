import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import RadialLiquid from "@/components/react-bits/radial-liquid";
import StaggeredText from "@/components/react-bits/staggered-text";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = {
  title: "Kimi K3：从回答问题到完成任务",
  description:
    "从 AI 产品经理视角拆解 Kimi K3，以及它相较 K2.6、K2.7 Code 在长上下文、Coding、原生多模态和知识工作上的产品跃迁。",
};

const modelStages = [
  {
    model: "K2.6",
    role: "通用多模态",
    context: "256K tokens",
    advance: "统一视觉与文本输入，兼顾对话、推理和 Agent 任务",
    productMeaning: "让 Kimi 从文字助手变成能看、能理解的通用工作入口",
  },
  {
    model: "K2.7 Code",
    role: "Coding 专项",
    context: "256K tokens",
    advance: "强化长上下文指令遵循与复杂编程任务成功率",
    productMeaning: "不再只追求代码写得快，而是提高工程任务做成功的概率",
  },
  {
    model: "K3",
    role: "开放旗舰 · 权重计划 7 月 27 日发布",
    context: "1M tokens",
    advance: "长周期 Coding、原生视觉、知识工作与深度推理合流",
    productMeaning: "从单点能力升级为能够持续执行、检查并交付成品的任务系统",
  },
];

const productMetrics = [
  ["任务完成率", "用户目标是否真正完成，而不是模型是否给出了一段看似合理的回答。"],
  ["人工接管率", "一次任务需要用户纠偏、补充信息或手工收尾多少次。"],
  ["可验证程度", "答案是否附带来源、过程、运行结果，以及可复核的中间产物。"],
  ["单位任务成本", "把模型、工具调用、等待时间和人工复核放在一起计算总成本。"],
];

export default function KimiK3ArticlePage() {
  return (
    <main className="secondary-page insight-page">
      <article>
        <header className="insight-hero">
          <div className="insight-hero-liquid" aria-hidden="true">
            <RadialLiquid
              width="100%"
              height="100%"
              speed={0.34}
              color1="#caff52"
              color2="#273314"
              color3="#0c0f09"
              backgroundColor="#070806"
              iterations={4}
              position="right"
              overallOpacity={0.86}
              scale={1.06}
              quality="medium"
              enableCursorInteraction
            />
          </div>
          <div className="insight-hero-scrim" aria-hidden="true" />
          <div className="page-shell insight-hero-inner">
            <div className="insight-kicker">
              <Link className="insight-back-link" href="/insights">最新资讯 / MODEL NOTES 001</Link>
              <span>2026.07.17</span>
            </div>
            <StaggeredText
              as="h1"
              text={"Kimi K3\n不是更大的聊天模型，\n而是一台正在成形的\n任务机器"}
              segmentBy="lines"
              className="insight-title insight-title-desktop"
              direction="bottom"
              delay={38}
              duration={0.78}
              blur
            />
            <StaggeredText
              as="h1"
              text={"Kimi K3\n不是更大的\n聊天模型，\n而是一台\n正在成形的\n任务机器"}
              segmentBy="lines"
              className="insight-title insight-title-mobile"
              direction="bottom"
              delay={34}
              duration={0.72}
              blur
            />
            <div className="insight-hero-bottom">
              <p>从 AI 产品经理的视角，判断一次模型发布的价值，不能只看参数和榜单，而要看它是否改变了用户完成任务的方式。</p>
              <div><span>作者</span><strong>祁宁 Miranda</strong><small>AI 商业化产品经理</small></div>
            </div>
          </div>
        </header>

        <div className="page-shell insight-layout">
          <aside className="insight-rail" aria-label="文章目录">
            <span>READING MAP</span>
            <a href="#judgment">01 / 核心判断</a>
            <a href="#evolution">02 / 版本演进</a>
            <a href="#product">03 / 产品变化</a>
            <a href="#metrics">04 / 指标迁移</a>
            <a href="#limits">05 / 边界与风险</a>
          </aside>

          <div className="insight-body">
            <section id="judgment" className="insight-lead">
              <span className="insight-section-no">01 / CORE JUDGMENT</span>
              <p className="insight-opening">Kimi K3 真正值得关注的，不是“2.8 万亿参数”这个数字本身，而是月之暗面正在把长上下文、Agent、Coding 和原生多模态压进同一个任务闭环。</p>
              <p>这意味着 Kimi 的竞争对象不再只是聊天框里的另一个模型，而是人类在研究、开发和内容生产中使用的整套工作台。模型的角色也随之变化：过去负责回答，现在开始理解目标、调用工具、检查结果并交付可继续使用的成品。</p>
              <blockquote>模型能力是供给，任务完成才是产品。</blockquote>
            </section>

            <section id="evolution" className="insight-section">
              <span className="insight-section-no">02 / FROM K2.6 TO K3</span>
              <h2>K2.6、K2.7 到 K3，<br />升级的不是同一条能力曲线</h2>
              <p>K2.6 解决的是通用与多模态问题，K2.7 Code 把重点收敛到复杂编程任务的可靠执行，而 K3 再次把能力面展开，但目标已经从“什么都会一点”变成“围绕复杂任务完成端到端交付”。</p>

              <div className="model-table" role="table" aria-label="Kimi 版本产品演进对比">
                <div className="model-row model-row-head" role="row">
                  <span role="columnheader">版本 / 定位</span>
                  <span role="columnheader">关键改进</span>
                  <span role="columnheader">产品意义</span>
                </div>
                {modelStages.map((stage) => (
                  <div className="model-row" role="row" key={stage.model}>
                    <div role="cell"><strong>{stage.model}</strong><small>{stage.role} · {stage.context}</small></div>
                    <p role="cell">{stage.advance}</p>
                    <p role="cell">{stage.productMeaning}</p>
                  </div>
                ))}
              </div>

              <p>K3 采用 Kimi Delta Attention、Attention Residuals 和更稀疏的 MoE 结构，总参数达到 2.8 万亿，但每次只激活 896 个专家中的 16 个。官方称，结合训练与数据方案的改进，其整体 scaling efficiency 相比 K2 提升约 2.5 倍。对产品团队而言，这个数字的意义不是“模型更大”，而是同样的算力更有机会被转化成可感知的任务能力。</p>
            </section>

            <section id="product" className="insight-section">
              <span className="insight-section-no">03 / PRODUCT SHIFT</span>
              <h2>三项变化，正在重写<br />AI 产品的交互范式</h2>

              <div className="insight-points">
                <article>
                  <span>01</span>
                  <div><h3>从短回答到长周期执行</h3><p>100 万 token 上下文让模型可以同时容纳大型代码仓库、长文档和更完整的任务历史。更关键的是，K3 被强化为能够持续操作终端、测试、修改和再次验证的长周期 Coding Agent。</p></div>
                </article>
                <article>
                  <span>02</span>
                  <div><h3>视觉进入执行闭环</h3><p>官方案例展示，K3 不只是“看懂一张图”，还可以读取前端、游戏或 CAD 的运行截图，再根据视觉结果继续修改代码。视觉从输入模态变成了模型检查自己工作结果的反馈通道。</p></div>
                </article>
                <article>
                  <span>03</span>
                  <div><h3>答案升级为可操作的交付物</h3><p>在官方展示中，Kimi Work 可以把研究结果转化为图表、交互网页、Widgets、Dashboard、PPT，甚至视频。聊天不再是最终界面，而是生成和维护工作成果的入口。</p></div>
                </article>
              </div>

              <p>这也是我理解的月之暗面产品战略变化：从长文本能力出发，逐步强化 Coding 和视觉表达，最终把复杂智能包装成用户能够看见、操作和传播的结果。可视化不是表层包装，它降低了验证成本，也让模型能力更容易形成传播和增长。</p>
            </section>

            <section id="metrics" className="insight-section insight-metrics-section">
              <span className="insight-section-no">04 / METRIC MIGRATION</span>
              <h2>如果我是产品负责人，<br />我会重新定义四个核心指标</h2>
              <div className="insight-metrics">
                {productMetrics.map(([title, description], index) => (
                  <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
                ))}
              </div>
              <p>这组指标会让团队从“模型说得像不像人”转向“用户是否更低成本地完成了目标”。它们也会倒逼产品补齐任务状态、过程可见性、权限确认、失败恢复和人工接管等基础能力。</p>
            </section>

            <section id="limits" className="insight-section">
              <span className="insight-section-no">05 / LIMITS &amp; RISKS</span>
              <h2>越能自主执行，<br />越需要清晰的产品边界</h2>
              <p>官方披露了两个非常典型的 Agent 产品问题：一是 K3 对完整思考历史的传递较敏感，在不兼容的 Agent 框架中途切换模型，输出质量可能不稳定；二是它在复杂任务上有时会“过度主动”，替用户做出超出预期的决定。</p>
              <p>因此，K3 不应该无差别地接管所有任务。产品层需要通过模型路由、权限分级、关键步骤确认和可回滚机制，把高能力放进明确边界。尤其考虑到 K3 的 API 定价高于 K2.6、K2.7 Code，真正合理的方案不是“全量升级”，而是让高价值、长周期任务调用 K3，让日常问答和明确的 Coding 任务继续由更轻的模型承担。</p>

              <div className="insight-conclusion">
                <span>FINAL TAKE</span>
                <p>Kimi K3 的发布说明，国产模型正在从“参数追赶”和“榜单突围”，进入产品形态竞争。下一阶段的胜负，不只取决于谁的模型更聪明，还取决于谁能把智能组织成稳定、可控、可验证的任务系统。</p>
              </div>
            </section>

            <section className="insight-sources" aria-labelledby="source-title">
              <span className="insight-section-no">SOURCES / OFFICIAL MATERIALS</span>
              <h2 id="source-title">资料来源</h2>
              <Link href="https://www.kimi.com/blog/kimi-k3" target="_blank" rel="noreferrer">
                <span>Kimi K3 官方技术博客</span><ArrowUpRight />
              </Link>
              <Link href="https://platform.kimi.com/" target="_blank" rel="noreferrer">
                <span>Kimi 开放平台模型说明与价格</span><ArrowUpRight />
              </Link>
              <Link href="https://mp.weixin.qq.com/s/V4xhEIy8xDXSMDPrPkmUAQ" target="_blank" rel="noreferrer">
                <span>Kimi K3 微信公众号发布文章</span><ArrowUpRight />
              </Link>
              <p>本文基于 2026 年 7 月 17 日公开信息。发布初期的演示与官方评测不能完全代表真实生产环境，产品结论仍需结合持续测试验证。</p>
            </section>
          </div>
        </div>
      </article>

      <Footer8
        dense
        statement="模型能力是供给，任务完成才是产品。"
        actionLabel="查看项目实践"
        actionHref="/projects"
        copyright="© 2026 QI NING / MODEL NOTES"
      />
    </main>
  );
}
