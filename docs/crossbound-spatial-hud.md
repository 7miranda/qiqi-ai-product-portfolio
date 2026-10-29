# Crossbound · 工业空间与 HUD 材质

日期：2026-10-29。基于 main `bfbb91e`，保留最新课程与线下营内容。

## 本轮视觉约束

- 以用户的三张科幻游戏界面参考为材质依据：有空间透视、光照渐变、半透面板、金属边缘与切角框。
- 保留银白建筑、蓝玻璃、园区模型、镜头与体量。只调整周围 HUD。
- 色彩仍为深蓝钢灰、冷青反光、低饱和绿选中面；荧光绿主要表示行动和当前状态。
- 非交互服务卡采用真实切角外轮廓和偶奇多边形完整包边。交互卡保持可见焦点框，以内层切角线、左侧选中光带与勾选区分状态。
- 一页采用三个材质深度：后景厂区、前景玻璃面板、内凹输入或数据槽。反光方向统一为左上明、右下暗。
- 不增加业务跳转、弹窗、动画或决策层级。

## 覆盖范围

| 区域 | 视觉处理 |
| --- | --- |
| 首页入口、情报与案例 | 金属导航轨道、分段标题条、完整双框、钢蓝玻璃 |
| 开场与企业服务 | 切角卡片、厂区透视后景、半透渐变与有厚度的操作条 |
| 3D 园区 | 原模型保留；任务指引、消息、按钮统一材质 |
| 商品库、供货与流程弹窗 | 商品展示舞台、金属工作轨道、凹陷表单与表格 |
| 商品上架工作室 | 切角预览壳、原生商品棚拍图、灯光与平台、选择光带 |
| 推广、物流与结算 | 同一玻璃面板、双层边框、内凹图表与数据区 |
| 基础课程与线下营 | 金属章节轨道、展开状态、数据槽与说明面板 |

样式分工：`details/home.css`、`details/workspaces.css`、`details/operations.css`、新增 `details/atmosphere.css`；新增课程样式沿用同一材质变量。生成器为五份共享 CSS 计算同一内容版本，课程和服务模块仍按自身内容生成版本。

320px 手机端的第五个导航入口铺满最后一行。服务标题按完整语义短句换行，输入框、选中按钮和底部操作条采用一致的小圆角。

## 实图验收

证据位于 [screenshots/crossbound-spatial-hud](./screenshots/crossbound-spatial-hud/)。

- 桌面：企业服务、情报、案例、商品库、服务表单、课程、园区、推广、商品上架。
- 手机：390px 服务和上架；320px 导航、课程、服务表单和上架。
- 上架室实测 390px / 320px 的容器 scrollWidth 与视口一致；向下滚动后 footer.bottom 保持 844，不穿过内容中部。
- 商品图沿用原生商品库的 480×320 棚拍渲染，使用 contain；没有拉伸图片或修改原模型几何。
- 独立视觉复核：已检查的首页区块、园区、商品库、服务、推广和上架桌面/手机截图均无新增 P1/P2。
- CSS 装饰层不捕获点击；保留焦点、禁用、选中和减少动态效果状态。

验证：95 项 Crossbound 测试、Next 静态构建、4 项站点导出测试通过。业务模块与接受基线的逐字保留检查通过。新增课程来自最新 main，本轮不改变课纲或课时。

## 工厂后景资产

使用内置 `image_gen` 生成，全新图片，非用户参考图裁切，也未复制参考中的人物、武器或游戏标志。

- 项目文件：[industrial-atmosphere.png](../public/previews/crossbound/assets/industrial-atmosphere.png)
- 1672×941，PNG，约 2.1 MiB；透明背景关闭。
- 原始产物：`/Users/a77/.codex/generated_images/01a1461d-8eb4-7c80-9936-a7ea3340a0d2/exec-d9eceef3-3cd6-4287-b694-f0bd2fe221bb.png`
- 方法：内置 imagegen 从文字直接生成，保存原始图片后作为 CSS 后景，与暗色渐变叠加，不承担交互。

完整提示词：

> Create one premium cinematic industrial environment background asset for a Chinese factory-to-global ecommerce simulation game website. Wide landscape 16:9 image, at least 1536 pixels wide. A sophisticated modern manufacturing and export distribution facility at blue hour, empty of people. Real architectural interior: brushed silver aluminum columns, dark blue glass mezzanine, distant production machinery and organized export crates, very subtle cargo loading bays. Strong foreground/midground/background depth: a dark charcoal foreground floor leading toward softly focused architectural structures in the background; clear converging perspective lines, generous quiet central and left negative space for readable UI overlays. Cold blue-teal volumetric light shafts from upper right, soft metallic specular edge reflections, gentle atmospheric depth haze, restrained warm ivory practical lights far in the distance. Rich layered gradients from deep navy shadow to slate blue and cool steel highlights. Realistic physically based industrial material rendering, refined spatial videogame main-menu atmosphere, visually consistent with silver-white miniature buildings and dark blue glass, mature enterprise technology aesthetic. Medium-dark exposure with visible material detail; not crushed black. No text, numbers, logos, symbols, UI panels, screens with legible content, people, characters, guns, military, violence, neon magenta, purple, excessive cyan bloom, high contrast spotlights or bright white blown highlights. This is a background scene, not a picture of a website.
