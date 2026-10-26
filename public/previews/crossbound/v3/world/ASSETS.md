# REQ-051 3D 世界资产与协议清单

| 资产 | 来源 | 协议 | 版本 / 日期 | 用途 |
|---|---|---|---|---|
| three.js（`vendor/three/three.module.min.js`、`three.core.min.js`） | npm `three` | MIT（见 `vendor/three/LICENSE`） | 0.185.0 / 2026-10-25 | 渲染；本地放置，不走 CDN |
| 房间、终端、展台、货箱、传送带、商品模型、供应商 NPC | 程序化生成（`v3/world/*.js`） | 本项目自有 | 2026-10-26 | 3D 房间（W1/W2/W5）全部几何体与动画；W3 商品图由同一商品模型渲染 |
| 2D 场景（W3/W4/W6） | 纯 DOM + CSS（`v3/world/scenes.js`、`world.css`） | 本项目自有 | 2026-10-26 | 无外部图片 |

规则：

- 新增第三方模型只用 CC0（Kenney、KayKit 等），逐项登记来源链接、协议和下载日期。
- 方案 §6 的参考仓库（three-player-controller、office-3d-web 等）目前只参考思路，未复制其代码或模型；如需引入代码，先核对其协议并在此登记。GPL 项目只参考机制。
- 带骨骼的小人模型在拿到明确授权文件前不引入，继续使用程序化角色。
