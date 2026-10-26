# Crossbound · Claude Code 工作约定

## 推送目标（硬性规则）

所有改动都推到用户自己的两个仓库，两边都要推：

- **GitHub**：`https://github.com/Cynthiawongss/crossbound.git`，本仓库的 `origin`
- **Codeup**：`https://codeup.aliyun.com/69a009d4b28d0aba0f5ea652/crossbound.git`。用户是管理员，同意直接推 `main`。推 `main` 可能触发 Jenkins 自动部署。

**永远不要推 `7miranda/qiqi-ai-product-portfolio`（"77 的仓库"）。** 本地 `D:\Users\CynthiaWong\Desktop\corssbound` 的 origin 就是它，不要从那个文件夹推送。

## 同步到 Codeup

GitHub 和 Codeup 的提交历史互不相关，没有共同祖先，不能直接 merge 或 push。同步步骤：

1. 以 Codeup `main` 为基础，从 GitHub 分支 checkout 代码路径：`.gitattributes public scripts tests/crossbound-v3-world.test.mjs`。以后新增的测试文件也要加进来。
2. 作为一个新提交追加到 Codeup `main`，然后推送。
3. **不带** `docs/`、`README.md`、`CLAUDE.md`。Codeup 自己维护 README、Jenkins 配置和数据库配置。

## Git 注意事项

- 不要 force push，也不要 amend 已经推送的提交。
- 不要动 `D:\Users\CynthiaWong\Desktop\crossbound-codeup`，那是用户自己的 Codeup 工作副本。

## 背景资料

- 3D 世界的交接记录在 `docs/crossbound-3D-交接记录.md`，包括架构、补丁挂点、本地存储键、阶段与世界的对应、待办和本地测试方法。
- 需求文档在 `docs/crossbound_3D世界需求文档.md`。
- 构建用 `npm run build:crossbound`，测试用 `npm test`。
