# Crossbound MySQL 数据库与部署交接

当前版本只使用 MySQL。游戏页面仍保持原园区和六步经营流程。部署参数见仓库根目录 README。

## 已验证的本机环境

- MySQL 8.0.41，InnoDB、utf8mb4；应用通过 PyMySQL 连接。
- 16 张表（含迁移表）、6 个查询视图，4 个有校验和的迁移脚本。
- 本机连接地址 127.0.0.1:23306，库名 crossbound；密码仅在忽略目录 `.crossbound-local`。
- Compose 容器 crossbound-mysql 使用持久卷，不将数据库数据放进 Git。
- 原 SQLite 已做完整备份并单向导入；运行服务不再读取或写入 SQLite。唯一保留的 SQLite 代码是旧数据迁移工具。

## 表与采集合同

| 表 | 数据来源与约束 |
|---|---|
| users | 匿名公司 ID、run_seed、source、game_version、first_seen、last_seen_at、唯一共建编号；anon_id/created_at 为兼容查询别名 |
| events | 进入、开始、到达步骤、退出、轮次完成、引导、报告与留资事件；ID 幂等；payload 保留 JSON；事件时间记录为 UTC |
| round_reports | 用户+轮次唯一；含市场、商品、品类、定价、数量、推广、交付、订单、退款、保留订单、利润、默认方案标记和规则版本；约束订单-退款=保留订单；较旧重试不覆盖新快照 |
| quiz_answers | 每次作答单独记录；task_type 区分总部题/复盘/问卷；问卷 correct=NULL，不混入知识题正确率 |
| feedback | 用户+first/deep 唯一；v2 三问按 player_segment、intent_shift、insight_moment 保存；free_text/help_wanted 对应 comment；旧问卷明确标记 legacy-v1，保留旧值；文字建议可空或15–100字符 |
| reward_claims | 用户+reward_type 唯一；反馈积分与徽章分开记录；引导完成奖励幂等；反馈写入和奖励写入为同一事务 |
| leads | 每次提交保存独立历史 ID；category、follower_tier、platform、touchpoint、consent_at、score、status；完整邮箱/微信用 Fernet 加密，contact_hash 用 HMAC 查找；常规管理列表只提供脱敏值 |
| assessments | 每轮评估和留资时评估快照；total_score、profit_score、stability_score、breadth_score、knowledge_score、level_title；分数约束0–100 |
| consent_records | 用户同意用途 cooperation_and_report、policy_version、consent_at；同一用途和时间去重；withdrawn_at 预留 |
| report_deliveries | 留资关联报告；page/email 分渠道唯一；pending/available/sent/failed/disabled；记录尝试次数和错误类型 |
| releases | 草稿/已发布版本、标题、发布时间；发布必须有时间 |
| feedback_reviews | 反馈外键、状态、版本外键、公开摘要、内部备注；采纳必须关联版本及摘要；已发布版本须先撤回再编辑 |
| admin_audit | 审核、发布和完整名单导出的管理审计；不写管理口令 |
| collection_deletions | 已删除匿名 ID 的 SHA-256；阻止旧浏览器队列重新写回已删数据 |
| import_batches | 旧库快照 SHA-256、每表数量、导入时间；拒绝覆盖非空目标库 |
| schema_migrations | 文件名、内容校验和、应用时间；已应用脚本不得修改，追加新迁移 |

业务 JSON 是原始记录；常用分析字段由 MySQL 生成列产生，避免同一字段两套值。应用写入基础列，不直接写生成列。动态 SQL 的表名均有固定白名单。

视图：lead_followup_queue、feedback_inbox、round_statistics、default_adoption_by_stage、questionnaire_segments、event_funnel。
名单视图每用户取最新提交；深度共建判定由服务端已有 deep 反馈且建议不少于15字产生；排序为深度优先、评估分降序、提交时间降序。历史提交仍保留在 leads 表。

## 本地启动与入口

```powershell
# 已准备好的本机环境
npm run preview -- --port 8765
# 或显式启动
.\.crossbound-local\venv\Scripts\python.exe scripts/crossbound-local/server.py --port 8765
```

游戏：http://127.0.0.1:8765/previews/crossbound/preview.html
管理：http://127.0.0.1:8765/local-admin
健康检查：http://127.0.0.1:8765/api/health（应返回 database=mysql）

管理口令 `.crossbound-local/admin-token.txt`；联系信息加密密钥 `.crossbound-local/contact-encryption.key`。二者和 mysql.json、mysql.env、邮件预览、旧库、备份均被 Git 忽略。不得放到公开静态目录。

## 公司 MySQL 接入

1. 准备 MySQL 8.0.21+ 专用空库、utf8mb4。生产建议按公司现有 MySQL 版本运行同一套集成测试。
2. 安装 `scripts/crossbound-local/requirements.txt`；设置 CROSSBOUND_MYSQL_HOST、PORT、USER、PASSWORD、DATABASE，或使用私有 mysql.json。运行时支持 MySQL 驱动 ssl 配置（通过私有 JSON），按公司数据库连接策略配置。
3. 固定配置 CROSSBOUND_CONTACT_KEY。迁移已有加密联系人时必须沿用原密钥，并独立备份；丢失密钥不能恢复联系方式。
4. 执行 `python scripts/crossbound-local/server.py --migrate-only`，依次应用001–004并记录校验和。不要仅手工执行001后启动服务；手工安装需同步登记各迁移的校验和。首次安装使用迁移器即可。
5. MySQL DDL 隐式提交；若安装中断，核对已执行语句及备份后恢复，不要删除正式库或盲目重跑。
6. 本地预览服务绑定127.0.0.1并使用 `/api`。部署 Dockerfile 启动 Gunicorn，监听5017，正式 API 为同源 `/crossbound/api`。反向代理配置见 deploy/nginx.conf.example；Host/Origin 通过 CROSSBOUND_PUBLIC_ORIGIN 配置。
7. 管理操作需 X-Admin-Token；上线应接公司管理员认证，不把管理口令放入玩家网页。

## API

下表为本地预览路径；正式部署全部增加 `/crossbound` 前缀。例如 `/crossbound/api/records`。

- POST /api/records：records 数组（最多100条），type/id/data/at；成功返回 accepted ID。事务失败不确认；断网保留队列；未满足前置轮次的记录会轮转重试，不堵住新战报。
- GET /api/community/adoptions：只返回已发布版本与 badge_number/summary，不公开原始反馈或联系方式。
- GET /api/admin/summary、feedback、leads、releases、deliveries：管理汇总、审核、脱敏名单、版本、报告状态。
- POST /api/admin/review、release：保存审核、发布/撤回公示。
- POST /api/admin/export-leads：有权限的完整联系人导出，并记录审计。
- POST /api/admin/lead-status：id/status（new/contacted/cooperating/invalid）。
- POST /api/admin/retry-delivery：重试失败的报告交付。
- POST /api/admin/delete-user：user_id 或 email，删除关联业务记录、预览邮件并写删除标记，阻止旧队列回灌。历史离线备份需按公司保留策略另行到期销毁。

## 报告交付

本机默认不对外发信：生成 `.crossbound-local/mail-preview/*.eml`，email状态available；未标成sent。配置 CROSSBOUND_SMTP_HOST、PORT、USER、PASSWORD、FROM 后才使用 STARTTLS 发信。页面下载和邮件使用同一份 report_text。失败保存错误类型，可在管理页重试。生产应通过邮件平台监控失败、退信；SMTP在发送后数据库提交前崩溃存在重复投递窗口，需要工程部署按服务商幂等能力处理。

## 备份、旧库迁移与验证

```powershell
python scripts/crossbound-local/export_mysql.py --output .crossbound-local/backup-20261022.sql
# 仅用于还没有导入过的空目标库；原库只读并先创建备份
python scripts/crossbound-local/migrate_legacy.py --source .crossbound-local/records.sqlite3
python -m unittest discover -s tests -p test_crossbound_mysql.py
npm test
npm run build:crossbound
```

备份使用MySQL一致性快照，包含全部15张业务/运维表；schema_migrations由目标迁移器建立。导入需同版本空表，不禁用外键、不使用REPLACE或--force。manifest记录各表数量与SQL内容SHA-256；加密密钥须另行备份。自动测试已在真实MySQL8.0.41创建隔离库验证备份恢复与联系人解密。

当前玩家经营结果来自浏览器模拟计算。SQL约束和校验保护记录一致性，不等于服务端反作弊；线上真实商业权益不能仅依赖客户端分数。
