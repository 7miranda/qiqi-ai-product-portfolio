import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import MetallicSwirl from "@/components/react-bits/metallic-swirl";
import StaggeredText from "@/components/react-bits/staggered-text";
import Footer8 from "@/components/blocks/footer-8";

export const metadata: Metadata = {
  title: "GPT-5.6：从模型升级到任务调度",
  description:
    "从 AI 产品经理视角拆解 GPT-5.6 Sol、Terra、Luna，以及 max、ultra、多智能体和 Programmatic Tool Calling 带来的产品变化。",
};

const modelTiers = [
  {
    model: "Luna",
    role: "最快、成本最低",
    price: "$1 / $6",
    advance: "以最低价格承接高频、明确、对时延敏感的日常任务",
    productMeaning: "适合作为规模化产品的默认执行层，而不是让旗舰模型处理所有请求",
  },
  {
    model: "Terra",
    role: "能力、速度与成本平衡",
    price: "$2.5 / $15",
    advance: "以低于 Sol 的价格提供接近或超过上一代旗舰的综合能力",
    productMeaning: "成为知识工作、Agent 与 Coding 场景中的主力任务层",
  },
  {
    model: "Sol",
    role: "旗舰复杂任务模型",
    price: "$5 / $30",
    advance: "强化长周期推理、Coding、计算机操作、设计判断与专业知识工作",
    productMeaning: "用于高价值、高不确定性、需要更强自主性的复杂任务",
  },
];

const productMetrics = [
  ["任务成功率", "模型是否真正完成了用户目标，并交付可继续使用的结果。"],
  ["有效结果时间", "从用户提出目标到获得可采用成果，需要等待和纠偏多久。"],
  ["人工接管率", "多步骤执行中，有多少环节仍需要用户补充、确认或返工。"],
  ["单位成功成本", "把模型费用、工具调用、并发 Agent 和人工复核合并计算。"],
];

export default function Gpt56ArticlePage() {
  return (
    <main className="secondary-page insight-page gpt-insight-page">
      <article>
        <header className="insight-hero">
          <div className="insight-hero-liquid" aria-hidden="true">
            <MetallicSwirl
              width="100%"
              height="100%"
              speed={0.18}
              zoom={4.8}
              iterations={10}
              brightness={0.78}
              backgroundColor="#070806"
              opacity={0.9}
              cursorInteraction
              cursorIntensity={0.7}
            />
          </div>
          <div className="insight-hero-scrim" aria-hidden="true" />
          <div className="page-shell insight-hero-inner">
            <div className="insight-kicker">
              <Link className="insight-back-link" href="/insights">最新资讯 / MODEL NOTES 002</Link>
              <span>2026.07.09</span>
            </div>
            <StaggeredText
              as="h1"
              text={"GPT-5.6\n不是 Sol 更强，\n而是模型开始被\n组织成任务系统"}
              segmentBy="lines"
              className="insight-title insight-title-desktop"
              direction="bottom"
              delay={38}
              duration={0.78}
              blur
            />
            <StaggeredText
              as="h1"
              text={"GPT-5.6\n不只是 Sol\n更强，\n而是模型开始\n被组织成\n任务系统"}
              segmentBy="lines"
              className="insight-title insight-title-mobile"
              direction="bottom"
              delay={34}
              duration={0.72}
              blur
            />
            <div className="insight-hero-bottom">
              <p>从 AI 产品经理的视角，GPT-5.6 最重要的变化不是又多了一个旗舰模型，而是能力、成本、推理深度与并发协作开始成为可调度的产品变量。</p>
              <div><span>作者</span><strong>祁宁 Miranda</strong><small>AI 商业化产品经理</small></div>
            </div>
          </div>
        </header>

        <div className="page-shell insight-layout">
          <aside className="insight-rail" aria-label="文章目录">
            <span>READING MAP</span>
            <a href="#judgment">01 / 核心判断</a>
            <a href="#tiers">02 / 模型分层</a>
            <a href="#orchestration">03 / 调度变化</a>
            <a href="#metrics">04 / 指标迁移</a>
            <a href="#limits">05 / 边界与风险</a>
          </aside>

          <div className="insight-body">
            <section id="judgment" className="insight-lead">
              <span className="insight-section-no">01 / CORE JUDGMENT</span>
              <p className="insight-opening">GPT-5.6 真正值得关注的，不是 Sol 在多少榜单上刷新了成绩，而是 OpenAI 正在把“一个模型”拆成一套可以按任务调度的智能供给系统。</p>
              <p>过去，产品团队通常先选一个主模型，再围绕它设计 Prompt、工具和交互。GPT-5.6 把选择进一步拆开：同一代模型拥有 Sol、Terra、Luna 三个长期能力层级，任务还可以叠加不同推理强度，复杂工作甚至能够通过 ultra 协调多个 Agent 并行推进。</p>
              <p>这意味着模型不再只是产品底部的一项技术依赖，而是像云计算资源一样，开始拥有性能档位、调度策略和成本结构。AI 产品经理的工作，也从“选择最强模型”转向“为不同任务配置最合适的智能预算”。</p>
              <blockquote>模型越多，产品越不能把选择题全部留给用户。</blockquote>
            </section>

            <section id="tiers" className="insight-section">
              <span className="insight-section-no">02 / SOL, TERRA &amp; LUNA</span>
              <h2>三个长期能力层级，<br />改变了模型版本的产品逻辑</h2>
              <p>GPT-5.6 的数字代表模型代际，Sol、Terra、Luna 则是能够独立演进的能力层级。这个命名变化看似只是整理模型菜单，实际上是在建立一套更稳定的产品契约：用户和开发者可以先理解任务档位，再适应每一档能力的持续升级。</p>

              <div className="model-table" role="table" aria-label="GPT-5.6 模型层级产品对比">
                <div className="model-row model-row-head" role="row">
                  <span role="columnheader">模型 / 定位</span>
                  <span role="columnheader">关键能力</span>
                  <span role="columnheader">产品意义</span>
                </div>
                {modelTiers.map((tier) => (
                  <div className="model-row" role="row" key={tier.model}>
                    <div role="cell"><strong>{tier.model}</strong><small>{tier.role} · {tier.price}</small></div>
                    <p role="cell">{tier.advance}</p>
                    <p role="cell">{tier.productMeaning}</p>
                  </div>
                ))}
              </div>

              <p>Sol 的 API 价格与 GPT-5.5 相同，输入和输出分别为每百万 token 5 美元与 30 美元；Terra 和 Luna 则进一步降低单位调用成本。Sol 同时提供约 105 万 token 上下文和 12.8 万 token 最大输出，为大型代码库、长文档和持续任务保留了更完整的工作记忆。</p>
              <p>对产品团队而言，关键不是把所有用户升级到 Sol，而是建立路由：高频明确任务交给 Luna，日常专业工作由 Terra 承担，只有真正复杂且高价值的任务才调用 Sol。</p>
            </section>

            <section id="orchestration" className="insight-section">
              <span className="insight-section-no">03 / FROM REASONING TO ORCHESTRATION</span>
              <h2>max 与 ultra 的分界，<br />是“想得更久”与“组织工作”</h2>

              <div className="insight-points">
                <article>
                  <span>01</span>
                  <div><h3>推理深度成为可配置资源</h3><p>在 ChatGPT 中，GPT-5.6 Sol 对应 Medium、High、Extra High 和 Pro 等不同强度；在 Work 与 Codex 中，max 为单个任务提供更深推理。用户看到的是一个档位，产品背后管理的却是等待时间、成本和成功率之间的交换。</p></div>
                </article>
                <article>
                  <span>02</span>
                  <div><h3>ultra 从单 Agent 走向并行协作</h3><p>ultra 不只是给同一个模型更多思考时间，而是让多个子 Agent 并行处理不同工作流，再由系统合并结果。复杂研究、产品分析和工程任务由此从一条长链，转向可以拆解、并发和汇总的任务网络。</p></div>
                </article>
                <article>
                  <span>03</span>
                  <div><h3>工具调用从逐次对话变成程序编排</h3><p>Responses API 的 Programmatic Tool Calling 允许模型在内存中编写和运行程序，协调工具并处理中间结果；Multi-agent 能力则进一步提供并发子任务。这会减少模型与工具之间反复往返的轮次，也让复杂流程更接近真正的执行系统。</p></div>
                </article>
              </div>

              <p>GPT-5.6 还把计算机操作和设计判断推到了更重要的位置。官方强调，它不仅生成代码或文档，还能检查渲染后的界面，发现视觉与功能问题并继续修正。对 AI 产品而言，这代表“生成”之后开始补上观察、验证和返工，闭环才真正成立。</p>
            </section>

            <section id="metrics" className="insight-section insight-metrics-section">
              <span className="insight-section-no">04 / METRIC MIGRATION</span>
              <h2>如果我是产品负责人，<br />我会用四个指标管理智能预算</h2>
              <div className="insight-metrics">
                {productMetrics.map(([title, description], index) => (
                  <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>
                ))}
              </div>
              <p>这四个指标必须组合观察。更强的模型可能提高成功率，却增加等待和费用；多 Agent 并发可能缩短交付时间，也可能放大重复工作与汇总误差。产品真正要优化的不是某个模型的调用量，而是一次成功任务的总成本。</p>
            </section>

            <section id="limits" className="insight-section">
              <span className="insight-section-no">05 / LIMITS &amp; RISKS</span>
              <h2>选择越丰富，<br />越需要产品替用户做判断</h2>
              <p>Sol、Terra、Luna，再叠加 Medium、High、Extra High、Pro、max 与 ultra，给专业用户带来了控制力，也给普通用户制造了新的理解成本。如果产品只是把所有档位塞进下拉菜单，就等于把模型路由、成本判断和风险决策重新推给用户。</p>
              <p>更合理的方案是让用户表达目标、时间要求和结果标准，由系统根据任务复杂度自动选择模型与推理强度；只有在高成本、高权限或不可逆操作前，才要求用户显式确认。同时，多 Agent 任务必须提供过程可见性、权限隔离、失败恢复与结果溯源，否则“更多 Agent”只会带来更难定位的错误。</p>
              <p>GPT-5.6 的更强网络安全能力也伴随更严格的保护与实时监测。对企业产品而言，能力开放不能脱离权限、审计和数据策略，尤其需要区分正常的防御性任务与高风险操作。</p>

              <div className="insight-conclusion">
                <span>FINAL TAKE</span>
                <p>GPT-5.6 的标志性变化，是模型竞争从“谁最聪明”进入“谁能更好地组织智能”。下一阶段的 AI 产品，不会只拥有一个模型入口，而会像操作系统一样，在用户看不见的地方调度能力、成本、工具与 Agent。</p>
              </div>
            </section>

            <section className="insight-sources" aria-labelledby="source-title">
              <span className="insight-section-no">SOURCES / OFFICIAL MATERIALS</span>
              <h2 id="source-title">资料来源</h2>
              <Link href="https://openai.com/index/gpt-5-6/" target="_blank" rel="noreferrer">
                <span>OpenAI：GPT-5.6 正式发布</span><ArrowUpRight />
              </Link>
              <Link href="https://help.openai.com/en/articles/20001354-gpt-56-in-chatgpt/" target="_blank" rel="noreferrer">
                <span>OpenAI Help Center：GPT-5.6 in ChatGPT</span><ArrowUpRight />
              </Link>
              <Link href="https://developers.openai.com/api/docs/models/gpt-5.6-sol" target="_blank" rel="noreferrer">
                <span>OpenAI API：GPT-5.6 Sol 模型说明</span><ArrowUpRight />
              </Link>
              <Link href="https://openai.com/index/previewing-gpt-5-6-sol/" target="_blank" rel="noreferrer">
                <span>OpenAI：GPT-5.6 Sol 预览与安全说明</span><ArrowUpRight />
              </Link>
              <p>本文基于 2026 年 7 月 17 日可获得的官方公开信息。模型能力、套餐范围与产品可用性仍可能随分批发布和后续更新发生变化。</p>
            </section>
          </div>
        </div>
      </article>

      <Footer8
        dense
        statement="模型越多，产品越需要替用户做好调度。"
        actionLabel="返回最新资讯"
        actionHref="/insights"
        copyright="© 2026 QI NING / MODEL NOTES"
      />
    </main>
  );
}
