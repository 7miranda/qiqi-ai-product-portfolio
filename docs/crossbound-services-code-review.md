# 企业服务增量代码审查与最终复核

复核日期：2026-10-22。范围：新增 `public/previews/crossbound/services/{model,ui,styles}`、`scripts/crossbound-v11/build.mjs` 的实际diff、两份生成页与本轮服务测试。只读产品实现；本次仅更新本审查文档，未修改实现、未外发、未调用真实业务API。

**当前结论：未发现仍未解决的P1/P2或实质发布阻断。** 上轮两个实现缺陷已修复；示例邮箱因用户新增明确授权，改判为获授权的演示占位，不再列为缺陷。浏览器尺寸、Tab/Escape与实际剪贴板交互仍由主任务的浏览器QA确认，本结论不冒充浏览器验收。

## 上轮事项的最终状态

| 原事项 | 当前证据 | 状态 |
|---|---|---|
| 删除存储失败却提示已删除 | `services/ui.js:87` 的catch现在显示“未能删除本机草稿”并立即return；不会清空仍被持久存储的草稿。 | **已修复** |
| 战报返回焦点选择器错误 | `build.mjs:108` 已改为 `[data-service-review-trigger]`，指向实际button自身；服务测试验证返回complete并请求该焦点，且不触发经营收尾。 | **已修复** |
| 页面显示示例邮箱 | 用户后续明确允许“邮箱先随便写”；当前保留reserved `.example`地址、标“演示邮箱”，纯code文本且无mailto或发送动作。 | **新授权占位，非缺陷** |
| model子模块缓存 | builder对model独立计算hash，更新ui的model import，再对服务资源组合计算hash；两份生成页的测试验证当前值。 | **已补齐** |

## 示例邮箱与 placeholder 标志

- `services/model.js:2`：`service@crossbound.example`，`placeholder:true`。
- `services/ui.js:90`：现在由 `CONTACT.placeholder && ...` 明确控制演示邮箱行是否显示；旁边始终说明“正式联系方式待公布”“清单不会自动发送”。
- 地址为纯文本`code`，无mailto、远程表单action、自动邮件或真实收件承诺；生成TXT需求清单也不带该地址。
- `placeholder`已参与渲染，保留有明确含义：true显示演示占位，false隐藏该行。它当前不会自动启用任何正式渠道，也不应被描述为已接入的商务配置。无需为通过本轮审查移除；未来切换真实联系方式时须另行核实地址与授权。

此项重新定性依据用户的新授权；此前在无授权条件下提出的删除示例地址建议已失效，不再作为发布阻断。

## 本机草稿复核

1. `services/ui.js:36–39` 在字段更新与切换服务时自动保存经过allowlist规范化的草稿，退出服务视图后可恢复，不依赖先点击形成清单。
2. 自动保存失败明确显示“浏览器无法保存草稿”；形成清单时的失败也提示复制或下载，不假报持久化成功。
3. 删除失败保留内存草稿与持久记录，显示失败；删除成功才清空草稿并显示成功。
4. 只写独立 `crossbound-service-brief-v1` 键；不收联系人字段，不写company、operations、settlement、徽章或成就存档。
5. HTTP复制仍先检测Clipboard API，再尝试选中文本和execCommand；失败提示手动复制/下载，不显示假复制成功。
6. 本地form的onSubmit先preventDefault；没有远程action、fetch、XMLHttpRequest、sendBeacon或mailto。TXT中仍保留“尚未发送、非正式报价、不代表下单或排期”的边界。

## 原弹窗与经营状态复核

- 首页和战报继续进入同一个原生campaign-dialog的services分支，服务h2复用唯一campaign-dialog-title。
- serviceReturn记录来源；左侧返回和Escape复用L7。战报来源返回complete，首页来源关闭原dialog回原入口。
- 新服务返回分支不调用游戏commit、rollback、下一轮、奖励或收尾函数；只读传递国家和商品名称作为练习背景，不带出模拟资金和利润。
- 修复后的战报焦点选择器匹配button本身；主任务仍应在真实浏览器确认document.activeElement落到新CTA，并确认徽章顶层弹窗行为未回归。
- 独立服务CSS未发现对旧游戏模型、Three画布或全站按钮的无关修改。

## 实际执行的验证

### 服务专项测试

运行：

```text
node --test tests/crossbound-services.test.mjs
```

结果：**19/19通过**。覆盖三服务边界、输入allowlist与限制、malformed存储、React文本转义、本机/未发送声明、授权演示邮箱无live handoff、两份生成页各一个服务分支、返回战报无结算副作用、焦点目标以及UI/CSS/model内容hash。

### 事件路径补充重放

使用实际createServicesUI模块和仅存在于Node进程中的fake-React/localStorage，未改产品文件：

- 输入修改后自动写本机存储；重新挂载能读回更新字段。
- removeItem抛错：存储仍有草稿，内存草稿保留，状态为“未能删除”。
- 正常删除：存储键移除，内存草稿清空，才显示“已删除”。
- 自动setItem抛错：明确显示“无法保存草稿”。

全部断言通过。该补充是代码事件路径验证，不等于真实浏览器渲染或系统剪贴板验收。

## 后续范围

本轮没有新增需要修复的P1/P2。保持主任务既定浏览器QA和原游戏回归检查即可，不需要为了本次服务入口扩展成真实注册、采集、CRM、支付或商务邮件系统。
