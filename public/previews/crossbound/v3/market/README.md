# 正式游戏 W0：市场与平台

采用用户确认的 Claude 原版地球、平台建筑、镜头及布局。字体对齐首页交付包：中文 Noto Sans SC 400/500/700/900；金额与数据 Oxanium 500/600、等宽数字；小型代码 JetBrains Mono。现金为 30px / 600 / #c4f53a。

`world/boot.js` 将本轮 stage 0 路由到 `host.js`。同源 iframe 内的 `viewer.html` 保留原版 DC/React 18/Three r160 场景；`frame.js` 与父页面只接受同源、指定窗口的消息。场景不读取演示存档、不自行扣款。

`session.js` 从游戏 snapshot 和 V2 引擎取市场、预测容量、平台配置、现金与报价。选择是本地草稿，确认时经现有 React actions 配置平台、选择市场并调用一次 commit；异步操作后重新核对轮次、资格、费用及现金。成功进入既有 W1 选品展厅。重复点击、旧轮次、现金不足及跨区试销限制均有保护。

市场首次进入费、Amazon 每轮店铺费、独立站一次建站费，全部沿用引擎规则。关闭场景不会扣款。WebGL 创建失败时仍可用列表和平台卡完成选择。

字体、地球贴图和运行库随前端一起打包，无市场场景外部 CDN 依赖。`licenses/` 保留 React、Three.js 和字体许可证；地球贴图来自原版使用的 Three r160 examples/textures/planets。中文子集覆盖场景、状态提示和当前 12 个市场文案；增添中文文案时需同步补齐字形。

验证：`node --test tests/crossbound-market.test.mjs`、`npm test`、`npm run build`。浏览器端实际走通新加坡 + Amazon → 扣除 $399 → 现金 $49,601 → W1。
