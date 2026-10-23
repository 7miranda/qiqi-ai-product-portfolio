# crossbound

跨境经营模拟游戏的产品文档与工程代码仓库。保留产品侧现行方案，并同步前端、后端、MySQL 建表迁移及部署配置模板。

## 现行文档（以这三份为准）

- [PRD · crossbound_v1.1_需求文档.md](docs/crossbound_v1.1_需求文档.md) —— 全部需求的唯一权威版本（50 个 REQ，含实现状态总表 §2.5）。**实现时以 PRD 为准；与其他文档冲突时以 PRD 为准。**
- [复盘 · crossbound复盘_缺失环节与优化方案.md](docs/crossbound复盘_缺失环节与优化方案.md) —— 历次审计与设计决策的依据和来龙去脉。
- [用户反馈与数据收集方案](docs/crossbound_用户反馈与数据收集方案.md) —— 数据表结构、接口、问卷 v2 定稿（与 PRD REQ-044/045/046 对应）。

## 辅助与参考

- [前端文案优化](docs/crossbound_前端文案优化.md) —— 文案规则 A/B/C，全站文案以此为准。
- [真实世界同步局方案](docs/crossbound_真实世界同步局方案.md) —— 已选定的爆点方向，尚未转成 REQ。
- [三大钩子方案](docs/crossbound_三大钩子方案.md) —— 内容已并入复盘 §三，存档参考。
- [卖点与爆点调研报告](docs/crossbound_卖点与爆点调研报告.md) —— 调研参考，部分数据未核实，勿对外引用。

## 历史存档（勿作实现依据）

- 经营类游戏方案.md、跨境电商方案_大卖.md、Web3经营类游戏收集.md —— 早期探索稿。
- crossbound_埋点需求_游戏即面试.md —— 已被《用户反馈与数据收集方案》取代。

> 文档由产品侧维护并同步推送；每次更新以 commit 信息标注对应的 PRD 修订次。


---

## 工程版本同步

本次同步自 Codeup main `f9d913b`，包含两轮操作高亮教程及新版星芒共建者徽章。数据库真实密码、加密密钥、用户数据及本地运行文件均不进入 Git。GitHub 保存代码与建表脚本，不托管 MySQL，也不自动同步公司数据库的数据。

## 构建与部署说明

游戏、MySQL 采集服务及部署文件的独立仓库。前端沿用现有园区、六步经营和徽章 UI；无需旧 GitHub 仓库或历史提交即可构建。

**Jenkins 工程部署从 [deploy/JENKINS.md](deploy/JENKINS.md) 开始。** 根目录 `Jenkinsfile` 提供构建、凭证注入、数据库检查/迁移、同主机发布及失败回退。默认只构建；公司 agent、正式域名和数据库账号待工程侧配置，尚未在公司 Jenkins 执行。

## 给部署同事的参数

| 项目 | 配置 |
| --- | --- |
| 后端技术 | Python 3.12 + Gunicorn，非 Java / Spring 服务 |
| 后端容器端口 | `5017`，监听 `0.0.0.0` |
| Context path | `/crossbound` |
| API | `/crossbound/api/...` |
| 健康检查 | `GET /crossbound/api/health` |
| 前端入口 | `https://你的域名/crossbound/` |
| 管理入口 | `/crossbound/admin`，API 需管理口令；入口建议另加公司 VPN 限制 |
| 日志挂载 | 宿主机 `/data/logs/crossbound-backend` → 容器 `/app/logs` |
| 私有文件挂载 | 宿主机 `/data/crossbound/backend` → 容器 `/app/data` |
| 数据库 | 公司 MySQL 8.0.21+，库名 `au-crossbound`；InnoDB / utf8mb4 |

日志命名沿用 `/data/logs/服务名` 规范；因为当前后端是 Python，服务名不加 `java-`。`PORT` 和 `CROSSBOUND_CONTEXT_PATH` 可以配置；修改 context 时也必须同步前端 `runtime-config.js` 与 Nginx。

## 前端打包命令

需要 Node.js 22 或更高版本、npm：

```sh
npm ci
npm run build
```

产物为 **`dist/crossbound/`**。把整个目录放到 `/data/www/crossbound`，按 `deploy/nginx.conf.example` 配置已有 HTTPS Nginx。前端不需要 Node 进程，也不需要 Next.js 服务。

`dist/crossbound/runtime-config.js` 默认指向同源 `/crossbound/api`。不要只部署静态页面而漏掉 API 反向代理，否则玩家数据只会留在浏览器待上传队列。构建基线在 `src/baseline/`，生成脚本在 `scripts/crossbound-v11/`，后续不要直接改生成的 HTML。

## 后端镜像与配置

Dockerfile 按公司模板使用 `hub.aukeyvalue.com/library/python:3.12-slim`、阿里云 Debian/PyPI 源及 `Asia/Shanghai` 时区，依赖入口为根目录 `requirements.txt`。构建机需能访问公司镜像仓库，并具备拉取权限。数据库采集时间仍统一保存 UTC。

本项目端口为 `5017`，使用 Gunicorn WSGI 入口。模板中的 `uvicorn run:app` 属于其他项目，不用于本服务。系统依赖只安装本项目需要的 `ca-certificates`、`tzdata`。数据与日志卷分别为 `/app/data`、`/app/logs`，宿主机挂载路径保持不变。

在仓库根目录构建：

```sh
docker build -t crossbound-backend:1.1.0 .
cp deploy/.env.example deploy/.env
```

仅在本地无法访问公司镜像仓库时，可显式覆盖基础镜像验证构建；这不能替代公司镜像的部署验证：

```sh
docker build --build-arg PYTHON_IMAGE=python:3.12-slim -t crossbound-backend:1.1.0 .
```

在服务器上填写 `deploy/.env` 中的公司 MySQL 连接信息、真实公网 origin（如 `https://game.company.com`，不带路径和尾斜杠）、管理口令与加密密钥。配置文件不进入 Git。

新环境可用镜像生成两个独立随机值，分别存入公司密钥管理系统：

```sh
docker run --rm crossbound-backend:1.1.0 python -c "import secrets; print(secrets.token_urlsafe(48))"
docker run --rm crossbound-backend:1.1.0 python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

第一个是 `CROSSBOUND_ADMIN_TOKEN`，第二个是 `CROSSBOUND_CONTACT_KEY`。**如果迁入已有留资数据，必须使用原加密密钥**，不可重新生成，否则旧联系方式无法解密。管理员口令不放 URL；前端包不包含数据库或管理凭证。

Linux 宿主机准备目录（容器 UID/GID 为 10001）：

```sh
sudo install -d -o 10001 -g 10001 -m 0750 /data/logs/crossbound-backend /data/crossbound/backend
chmod 600 deploy/.env
```

## MySQL 建表与迁移

脚本位于 `database/mysql/001_*.sql` 至 `004_*.sql`，包括 15 张业务/管理表、1 张迁移表、6 个视图。详见 `database/README.md`。迁移器按顺序执行、保存校验和、使用数据库锁；服务启动仅验证版本，不自动修改表。

先由 DBA 建立专用库（不要使用公司其他业务库）：

```sql
CREATE DATABASE IF NOT EXISTS `au-crossbound` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

用有 DDL 权限的迁移账号填写临时 `deploy/.env.migrate`，连接同一库；执行以下命令建立全部表及视图：

迁移凭证模板为 `deploy/migration.env.example`，运行凭证模板为 `deploy/.env.example`。Jenkins 中分别使用两个 Secret file。库名含连字符时 SQL 标识符须加反引号；环境变量值直接写 `au-crossbound`。

```sh
docker run --rm --env-file deploy/.env.migrate crossbound-backend:1.1.0 python scripts/crossbound-local/server.py --data-dir /tmp/crossbound-migration --migrate-only
```

迁移账号需该库的 `CREATE, ALTER, INDEX, REFERENCES, CREATE VIEW, DROP, SELECT, INSERT, UPDATE, DELETE` 权限。不要手动执行一半 SQL 后跳过迁移记录。MySQL DDL 不支持整体回滚，已有环境升级前先备份，发生错误应排查具体迁移后恢复或修复，不能盲目重试失败的非幂等 DDL。

运行账号 `crossbound_app` 只需该库的 `SELECT, INSERT, UPDATE, DELETE`。账号来源限制由 DBA 按部署网络设置。`schema_migrations` 中必须有 4 个匹配校验和的版本；`backend/app.py` 在版本不匹配时拒绝启动。

**本地测试库已验证执行；公司 RDS 地址已提供，账号、密码及网络权限尚待配置，未在公司数据库执行。** 仓库不含任何本机数据备份。已有测试数据是否迁入生产由业务负责人决定，不能把测试用户混入正式采集。

## 启动与验证

需要 Docker Compose 2.30+，使用 raw 环境文件避免密码中的 `$` 被展开。不要在 env 值外额外加引号。

```sh
docker compose -f deploy/compose.yaml up -d
curl http://127.0.0.1:5017/crossbound/api/health
docker compose -f deploy/compose.yaml ps
```

配置 Nginx 后再检查公开地址 `/crossbound/api/health` 返回 `{"status":"ok","database":"mysql"}`，并走一轮游戏、反馈和留资确认后台收到记录。应用只接受配置域名和同源请求；内部探针仅放行健康检查。宿主机端口默认只绑定回环地址，由 Nginx 对外提供 HTTPS。如果反向代理在另一台机器/容器，应按公司网络方案修改端口绑定和 upstream。

## 日志与报告投递

- `access.log`：时间、进程、方法、路径、状态、耗时；不记录查询参数、请求体、口令或联系方式。
- `error.log`：Gunicorn 运行及应用异常类型。读取 `/data/logs/crossbound-backend/` 即可排查。
- 报告投递由独立 `worker` 容器处理，同时写入挂载目录的 `worker.log`；控制台日志使用 Docker 限额轮转（每文件 10 MB、保留 5 个）；查看 `docker compose -f deploy/compose.yaml logs worker`。
- 把 `deploy/logrotate.conf` 安装到宿主机 `/etc/logrotate.d/crossbound`，每日轮转后端文件日志、保留 14 份；`copytruncate` 在轮转瞬间有极小日志丢失窗口，采集业务数据以 MySQL 为准。
- 未配置 SMTP 时仅在私有目录保存 `.eml` 预览，不能宣称邮件已发出；正式上线需配置 SMTP 并验证实际收信。
- MySQL 数据和 `CROSSBOUND_CONTACT_KEY` 都需要单独加密备份。日志挂载不等于数据库备份。

## 本地开发与测试

```sh
npm ci
python -m venv .crossbound-local/venv
# Windows 使用 .crossbound-local/venv/Scripts/python；Linux 使用 bin/python。
.crossbound-local/venv/bin/python -m pip install -r scripts/crossbound-local/requirements.txt
npm run build:crossbound
npm test
```

通过环境变量 `CROSSBOUND_MYSQL_*` 配置本机 MySQL 后运行 `npm run preview`，入口为 `http://127.0.0.1:8765/previews/crossbound/preview.html`。原本地预览的 `/api` 前缀保持兼容，正式构建使用 `/crossbound/api`。

实际数据库测试：用仅用于测试且可建/删临时库的 MySQL 账号配置相同环境变量，然后执行 `python -m unittest discover -s tests -p test_crossbound_mysql.py -v`。测试创建随机 `crossbound_test_*` 库并清理；不要使用生产管理员账号。

采集当前以匿名浏览器身份和客户端经营记录为基础，不是实名登录或防作弊服务；不能把经营分数当作经服务器认证的职业评估。上线前仍需公司完成 HTTPS、访问权限、隐私告知、备份及真实邮件联调。
