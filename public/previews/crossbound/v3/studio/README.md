# 商品页工作室

基于用户提供的《商品页工作室交互设计.zip》接入 W3。设计稿提供布局、全息卡和动效参考；商品、报价和扣款由现有游戏引擎决定。

- `host.js`：正式游戏的全屏场景，限制同源父子窗口通信。
- `session.js`：本轮草稿、引擎报价、发布确认、沿用与优化已有商品页。
- `viewer.html` / `studio.css`：保留交付稿的全息卡、翻面、扫光和三个工作台；桌面按窗口高度布局，无页面纵向滚动；窄屏改为顺序布局。
- `demo.html`：六件现有商品的独立体验预览，使用真实引擎，状态只保存在当前页面内存，不修改正式游戏存档。
- `demo-engine.js`：由 `node scripts/build-studio-demo.mjs` 从项目基线生成，商品目录和模型均来自现有代码。

从项目根目录运行 `python -m http.server 8768 --bind 127.0.0.1 --directory public`，打开 `/previews/crossbound/v3/studio/demo.html`。完整游戏入口为 `/previews/crossbound/preview.html?world=on`。

构建：`npm run build:crossbound`。测试：`npm test`。新增测试覆盖报价与商品绑定、返回后草稿恢复、未完成/现金不足阻止发布、重复扣款保护、异步存档失败、过期轮次、沿用和本地化费用，以及每轮一次的优化。

浏览器验收：1366×768 桌面一屏布局、390px 窄屏、六商品切换，以及完整游戏“市场 → 选品 → 供货 → 定价 → 工作室 → 推广”路径。发布与重进草稿均已核对。
