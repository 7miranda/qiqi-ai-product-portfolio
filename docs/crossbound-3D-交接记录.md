# Crossbound 3D 世界 · 交接记录（chat → Claude Code）

整理时间：2026-10-25（PDT）。本文汇总这段对话里的需求、决定、实现和现状，供 Claude Code 接手。早期对话已被系统压缩，只保留了摘要；文末附有最近几轮的原话。

---

## 1. 项目与仓库

- **项目**：傲基跨境大学 · Crossbound 跨境经营模拟游戏。已工程化，部署在公司内网。
- **本地源码**（用户电脑）：
  - `D:\Users\CynthiaWong\Desktop\crossbound-github`：GitHub 仓库的工作副本，主要在这里开发。
  - `D:\Users\CynthiaWong\Desktop\crossbound-codeup`：用户自己的 Codeup 工作副本（分支 `codex/engineering-release`），**不要动**。
  - `D:\Users\CynthiaWong\Desktop\cb-codeup-req051`：本次新建的 git worktree（属于 github 仓库，分支 `codeup-req-051`，基于 Codeup main）。`node_modules` 是指向 crossbound-github 的 junction。
- **远端**：
  - GitHub `Cynthiawongss/crossbound`：用户自己的仓库，`main` 和 `feat/req-051-world` 当前都在 `e45ac4c`。
  - Codeup `https://codeup.aliyun.com/69a009d4b28d0aba0f5ea652/crossbound.git`：公司仓库。`main` 当前在 `56d946b`，`feat/req-051-world` 也在 `56d946b`。
  - **两边提交历史互不相关**，没有共同祖先。同步方法：在 Codeup main 上把代码路径（`.gitattributes public scripts tests/crossbound-v3-world.test.mjs`）从 GitHub 分支 checkout 过来，作为一个新提交追加上去。不带 `docs/` 和 `README.md`。Codeup 的 README、Jenkins 配置和数据库配置都只在 Codeup 那边。
  - 用户是 Codeup 管理员，已同意直接推 Codeup `main`。Codeup `main` 可能接 Jenkins 自动部署。
- **硬性约束（用户原话）**：「不要更新到77的那个仓库」，即**永远不要推** `7miranda/qiqi-ai-product-portfolio`。
- **Git 操作**：强推被拦截过，请避免 force push / amend 已推送的提交。GitHub 上 `5cc0195` 的提交说明写错了（实际是 P0.1），已用空提交 `9ecc697` 补说明。

## 2. 架构要点（原版游戏没有源码，只能叠一层）

- **原版游戏**只有压缩后的 bundle `src/baseline/index.html`（约 7.3 MB，由 77 构建）。
- **构建**：`scripts/crossbound-v11/build.mjs` 用 `replaceOne` / `replaceFunction` / `replaceElement`（TypeScript AST）做字符串补丁，输出 `public/previews/crossbound/index.html` 和 `preview.html`。命令是 `npm run build:crossbound`，测试是 `npm test`（当前 92 项全部通过）。
- **主组件 `Roe` 的关键状态**：
  - 公司与进度：`t` 是公司状态，`Et` 是阶段 0–5，`ms` 表示已结算（阶段 6）。
  - 当前步骤的数据：`La` 是选项，`Ia` 是已选项，`pr` 是预测，`ec` 是市场。
  - 动作：`cr()` 是提交（已打补丁：提交后会自动打开下一步面板）；`u(view)` 打开面板；`A` 是 select；`qe` 是 setSupplier；`R5(product)` 返回供应商报价。
- **引擎阶段**：0 选择市场 / 1 选择商品 / 2 定价备货 / 3 上架推广 / 4 发货收款 / 5 安排下轮 / 6 已结算。
- **注意**：阶段 2 开始时引擎会把供应商重置为 standard，必须重新写入（见 `world.js` 的 `engine.supplier`）。
- **补丁挂点**：
  - 状态快照：`useLayoutEffect` 里调用 `window.CrossboundView.publish({...actions})`，在浏览器绘制前推送。
  - 园区组件 `Vse`：`v3Paused` 让 3D 世界或面板打开时暂停 2D 园区的渲染循环。
  - 2D 的「进入 3D 世界」按钮：`.v3-campus-3d`，插在 `enterprise-campus-v17__guide`（园区导览）左边。宽度由 boot.js 用 ResizeObserver 写入 `--v3-guide-w`。
  - `<head>` 里有一段同步脚本：判定模式；3D 老玩家直接显示加载页，并加 `?start=1` 跳过首页。
  - `boot.js` 在应用模块之前加载。
- **3D 层的文件**（`public/previews/crossbound/v3/world/`）：
  - `logic.js`：纯逻辑，有单元测试。包括 `decideMode`、`currentWorld`、`doorStates`、`taskFor`、`restoreSpot`、`archetypeFor`、`QUALITY` 等。
  - `boot.js`：模式判定、加载页、首次选择页、`switchMode`、懒加载 `world.js`、2D 下补写供应商。
  - `world.js`：three.js 场景、引擎桥接、交互、拿起商品的飞行动画、舒适度设置、位置保存与恢复、消息提醒镜像。
  - `hub.js`：总部街区，7 扇世界门，没有天气。
  - `showroom.js`：W1 选品展厅。
  - `rooms.js`：W2 定价财务室、W5 物流仓（P1 第一批）。
  - `products.js`：20 种低多边形商品模型及各自的打开动画。
  - 其余：`ui.js`、`kit.js`、`world.css`。
  - three.js r185 放在本地 `vendor/three`（MIT 许可），不用 CDN。
- **部署开关**：
  - `CROSSBOUND_WORLD = off | on | split`。打包脚本 `package-frontend.mjs` 默认写 `off`，所以公司部署默认不开 3D。
  - 本地预览的 `runtime-config.js` 设为 `on`。
  - URL 参数 `?world=on|off` 可以临时覆盖。
- **本地存储键**：
  - `crossbound-company-v1`：存档。
  - `crossbound-view-mode-v1`：记住的模式（`3d` / `2d`）。
  - `crossbound-world-state-v1`：场景与位置。
  - `crossbound-world-w1-v1`：W1 里选的商品和供应商。
  - `crossbound-world-comfort-v1`：舒适度设置。
  - `crossbound-world-quality-v1`：画质档。

## 3. 世界与引擎的对应关系（已修正）

| 阶段 | 3D 位置 | 现状 |
|---|---|---|
| 0 | 总部街区 · 世界地图终端 | 已实现。选好后**直接进 W1** |
| 1 | W1 选品展厅 | 已实现。商品和供应商都选好后**自动提交，直接打开定价备货面板** |
| 2 | W2 定价财务室 | 已实现。拉杆选档、成本板、控制台确认、落箱；精细调价走 2D 面板 |
| 3 | W3 商品页工作室（未上架）/ W4 推广室（已上架） | 未建，用 2D 面板 |
| 4 | W5 物流仓 | 已实现。三条传送带选履约，结算播放出仓和"按成本退回"动画（REQ-052） |
| 5、6 | W6 财报结算厅 | 未建。阶段 6 时门保持「进行中」，进门直接打开本轮战报 |
| — | W7 荣誉墙展厅 | 常驻入口，打开成就面板，不作为任务 |

## 4. 已完成的版本

1. **P0**（GitHub `a7f682b`）：街区可第三人称行走，W1 展厅完整走通，未建的世界退回 2D 面板。
2. **P0.1**（GitHub `5cc0195`），对应《3D 世界体验反馈与双模式需求》：
   - **刷新闪现（B-001～004）**：加载页、位置恢复。实测连续刷新 10 次没有平面界面露出，每次 1.2～2.7 秒可操作。
   - **双模式（M-001～007）**：首次进入二选一且不预选，切换 ≤1.5 秒，进度互通，舒适度设置（灵敏度、镜头晃动、FOV 55–75），低端设备推荐 2D 但不强制。
   - **商品实物（F-001～004）**：100 件商品对应 20 种模型；拿起时 0.4 秒飞到头顶；选中状态为常亮绿圈、放大 1.2 倍、头顶「✓ 已选」标签。
   - **天气与画质**：删除雨效，画质档改为调节霓虹光晕强度。
3. **试玩反馈修正**（GitHub `e45ac4c`；Codeup `56d946b` 包含全部以上内容）：
   - 2D 的 3D 入口挪到园区「园区导览」左边。
   - 供应商对话里，回车不再误触「再看看」；默认聚焦「选他」。
   - 选完就进下一环节，不用回出口再进门。
   - 结算后引导改为「去财报结算厅看战报、开启下一轮」。
   - 3D 右上角新增「消息提醒」，镜像 2D 园区的 `.v11-notification-dock`。点击就是触发原按钮，打开对应面板。

## 5. 需求文档（只在 GitHub 上）

- `docs/crossbound_3D世界需求文档.md`：87 条需求。附录 A 记录 P0 实现对齐，附录 B 记录 P0.1 和试玩修正。
- 3D 方案 v2、《3D 世界体验反馈与双模式需求》。

## 6. 下一步 / 待办

- **P1**：W2、W5 已建（2026-10-26）。剩 W3 商品页工作室、W4 推广室、W6 财报结算厅，以及 W2 价格拨盘、W5 头程航线（见需求文档附录 C）。
- **已知小问题**：
  - 手机竖屏的选择页，2D 卡片在第一屏以下，要往下滑。
  - 3D 切 2D 时会自动打开当前步骤面板，原生 modal 会挡住顶栏。
  - 2D 切 3D 时出现在当前世界门口，不回到原位（只有刷新才恢复原位）。
  - 2D 园区自带一份 three.js，与 3D 层的 three 同时加载，控制台会提示「Multiple instances」，无害。
- 若 GitHub 后续有改动，需要按第 1 节的方法再追加到 Codeup `main`。

## 7. 本地测试方法（用户电脑）

- 静态服务器：`C:\Users\CynthiaWong\AppData\Local\Temp\cb-static.mjs`，以 `crossbound-github\public` 为根目录，端口 8790。地址 http://127.0.0.1:8790/previews/crossbound/preview.html
- Playwright：用 `D:/Users/CynthiaWong/Desktop/CyberCEO-Intelligence Hub/cockpit-demo/node_modules/playwright-core`。
  - 环境变量 `PLAYWRIGHT_BROWSERS_PATH=%LOCALAPPDATA%\ms-playwright`。
  - 启动参数 `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`（SwiftShader 太慢会卡死）。
- QA 脚本在 `%TEMP%`：
  - `cb-world-qa.cjs`：P0 主流程。
  - `cb-p01-qa.cjs`：选择页、10 次刷新、往返切换、舒适度。
  - `cb-p02-qa.cjs`：园区入口、键盘对话、自动进入下一环节、消息提醒。
- 截图在 `D:\Users\CynthiaWong\Desktop\corssbound\.crossbound-local\`（已加入 gitignore）。
- 3D 层提供测试钩子 `window.CrossboundWorld`：`state`、`teleport(x,z)`、`interactWith(id)`。

---

## 附：最近几轮对话原话

> **用户**：看一下github刚刚提交的最新的两个文档，再出一个版本迭代
>
> **Claude**：按两份新文档完成了 P0.1（闪现修复、双模式、商品实物、删雨效），已推到 GitHub `feat/req-051-world` 和 `main`。

> **用户**：打开给我看看
>
> **Claude**：在桌面版右侧浏览器面板打开了本地预览，停在首次进入的二选一页。

> **用户**（附五张截图）：改一下。截图里的标注是：
> 1. 「3d入口放到这里吧」，指向园区导览左侧。
> 2. 「再点击回车 进入不了选择页面 直接就退出了」，指供应商对话。
> 3. 「我觉得选完之后直接就进入下一个环节 不要又让我出去再进入」。
> 4. 「我进去看过了 为什么还有这样的显示 而且我觉得引导机制不够强，比如去荣誉墙展厅我点开之后你直接跳转到我要看的部分就行了 然后其他的我自己就会看 不要搞出来那种我进去看了一轮 出来之后又说还要看 我哪知道看哪才会结束啊 就是目前的下一步引导性和交互感不够强啊」。
> 5. 「为什么3D没有这些消息提示啊」，指 2D 园区的消息提醒。
>
> **Claude**：五项全部修复（见第 4 节第 3 条），推到 GitHub `e45ac4c`。

> **用户**：你试一下能不能推上去codeup https://codeup.aliyun.com/69a009d4b28d0aba0f5ea652/crossbound.git
>
> **Claude**：Codeup 与 GitHub 历史不相关。在 Codeup main 之上追加了一个只含代码的提交 `56d946b`，先推到新分支 `feat/req-051-world`。

> **用户**：你可以直接推到main 因为我是管理员
>
> **Claude**：已推 Codeup `main`（`f9d913b..56d946b`，普通追加）。部署时如果没设 `CROSSBOUND_WORLD`，3D 默认关闭。
