# Crossbound Jenkins 工程部署交接

## 当前测试环境的 SSH 发布

现有 `crossbound-test` 任务使用 `deploy/Jenkinsfile.test`，从构建节点通过 SSH 发布到 `172.16.1.37`，运行配置读取目标服务器 `/data/crossbound/.env-test`。构建节点和目标服务器需预先登录镜像仓库；流水线不包含仓库密码。

测试数据库固定为 RDS 内网 `rm-wz95q3ykydacm3q5b.mysql.rds.aliyuncs.com` 的 `au-crossbound` 库。发布前校验配置、数据库和迁移，发布后验证 `5017/crossbound/api/health`。日志挂载为 `/data/logs/crossbound` → `/app/logs`，保留原数据卷及停止的旧容器。下方根目录 `Jenkinsfile` 是另一种部署主机 agent 方案。

## 现状与职责

应用为静态前端 + Python/Gunicorn 后端 + Python worker + 公司 MySQL，非 Java 服务，不使用 application.yml。
应用读取环境变量，配置模板在 `deploy/.env.example`。真实配置由 Jenkins Secret file 注入；不是将数据库密码写入代码或镜像。

本仓库提供 Jenkinsfile、前端构建、后端 Dockerfile、配置校验、迁移、发布和检查脚本。**尚未连接公司 Jenkins 执行；下列基础设施项需要工程侧完成。**

| 工作 | 责任方 |
| --- | --- |
| RDS 开库、账号授权、网络/白名单、备份 | 工程同事/DBA |
| 表、字段、约束、迁移版本与应用写入代码 | 本项目 |
| Jenkins Job、agent、Codeup 拉取权限、镜像仓库权限 | 工程同事 |
| 正式域名、HTTPS、Nginx、日志轮转安装 | 工程同事 |
| 填真实连接配置并上传 Jenkins Credentials | 工程同事，按本项目模板 |

## 已定参数

- Jenkins 地址：`https://jenkins.aukeyvalue.com/`。知道控制台网址不等于已经确定 agent/部署主机。
- 源码：Codeup `crossbound`，`main` 分支，根目录 `Jenkinsfile`。
- 数据库名：**`au-crossbound`**。
- RDS 内网地址（用户提供）：`rm-wz95q3ykydacm3q5b.mysql.rds.aliyuncs.com`，端口先按 `3306`，由 DBA 核对。
- 后端端口：`5017`；context path：`/crossbound`。
- 日志：`/data/logs/crossbound-backend` → `/app/logs`。
- 私有数据/邮件预览/TLS 证书：`/data/crossbound/backend` → `/app/data`。
- 前端目录：`/data/www/crossbound`，发布时为指向版本目录的符号链接。
- 公网域名、DB 账号、密码、agent 标签 **待工程侧提供**。不填写假值来冒充可部署状态。

## 流水线支持的部署拓扑

当前 Jenkinsfile 采用：**Linux Jenkins agent 位于实际部署主机，Docker daemon 也在同一主机**；Nginx 运行在宿主机。
控制台可以在其他服务器。工程侧把部署主机 agent 标签填入 `DEPLOY_NODE`；默认 `crossbound-deploy` 是约定标签，并非已发现的节点。
如果公司使用 SSH 发布、Kubernetes、独立构建机或远程 Docker，请工程侧说明目标方式后接入发布阶段，不要在普通构建节点勾选 DEPLOY。
不需要在 Jenkins 控制器上运行 Docker，也不要向公网开放 5017。

## 工程侧一次性准备

1. agent 安装 Git、Node.js 22+、npm、Docker Engine、Docker Compose **2.30+**、bash、curl、flock、GNU coreutils；能访问公司 Python 镜像仓库、依赖源及 RDS 内网。登录镜像仓库由工程侧按公司凭证规范处理。
2. 安装 Jenkins Pipeline、Git、Credentials Binding 插件。创建受信任项目专用 Job/agent，限制凭证使用范围。Docker 权限等价主机高权限，不让不可信分支使用生产凭证。
3. DBA 执行 `database/create-database.sql` 建库；连字符库名必须加反引号。准备运行账号（该库 SELECT/INSERT/UPDATE/DELETE）和迁移账号（另加 CREATE/ALTER/INDEX/REFERENCES/CREATE VIEW/DROP）。不要求应用拥有全实例 root 权限。
4. RDS 白名单放行实际部署节点/VPC，不是操作者电脑公网 IP。确认 RDS 版本 MySQL 8.0.21+，InnoDB/utf8mb4；生产迁移前做好备份。
5. 创建目录。把下列 `jenkins` 换成实际 agent 的系统用户名/组；首次创建时执行，不要改变其他项目目录所有权：

```sh
sudo install -d -o 10001 -g 10001 -m 0750 /data/logs/crossbound-backend /data/crossbound/backend
sudo install -d -o jenkins -g jenkins -m 0700 /data/crossbound/config
# /data/www 是专用发布根；若公司已有共享目录，由工程侧授予本项目所需 ACL，不覆盖既有权限。
sudo install -d -o jenkins -g jenkins -m 0755 /data/www /data/www/releases /data/www/releases/crossbound
```

6. 在 HTTPS Nginx server 中引入 `deploy/nginx.conf.example`，执行 `nginx -t` 后由工程侧 reload。安装 `deploy/logrotate.conf`。首次若 `/data/www/crossbound` 已是普通目录，请先保留旧目录并迁成版本目录链接；脚本会拒绝覆盖普通目录。

## Jenkins 凭证：填哪些值

在项目可用的 Credentials 域中创建两个 **Secret file**：

| 建议 ID | 上传内容 |
| --- | --- |
| `crossbound-prod-env` | 填好 `deploy/.env.example` 的副本；实际运行账号 |
| `crossbound-prod-migration-env` | 填好 `deploy/migration.env.example` 的副本；迁移账号，仅执行迁移阶段时使用 |

文件格式为一行 `KEY=value`，值按字面量保存：不要加引号，不写 `export`，不写行尾注释。密码中的 `$`、`#` 不展开。流水线不使用 `source`，不输出文件内容或完整 Compose 配置。

| 配置项 | 必填/含义 |
| --- | --- |
| CROSSBOUND_MYSQL_HOST / PORT / DATABASE | 必填；已给内网地址、3306、au-crossbound，工程侧核实 |
| CROSSBOUND_MYSQL_USER / PASSWORD | 必填；运行账号与迁移账号分别填写 |
| CROSSBOUND_PUBLIC_ORIGIN | 运行必填；实际 `https://域名`，不带 `/crossbound` 或尾斜杠 |
| CROSSBOUND_ADMIN_TOKEN | 运行必填；随机管理口令，至少32字符 |
| CROSSBOUND_CONTACT_KEY | 运行必填；Fernet 联系方式加密密钥，永久保管；导入已有数据必须沿用原密钥 |
| CROSSBOUND_MYSQL_SSL_CA | 可选；RDS 启用 TLS 时填写 `/app/data/tls/ca.pem`，将 CA 放入宿主机私有目录；自动验证证书与主机名 |
| CROSSBOUND_MYSQL_SSL_CERT / KEY | 可选；双向 TLS 时成对填写，不需要时留空 |
| CROSSBOUND_SMTP_HOST / PORT / FROM / USER / PASSWORD | SMTP_HOST为空时只生成私有邮件预览；要实际发邮件须完整填写 STARTTLS SMTP 配置 |

生成全新环境密钥（由工程侧执行并保存到凭证系统；不要每次构建重建）：

```sh
docker run --rm crossbound-backend:你的构建标签 python -c 'import secrets; print(secrets.token_urlsafe(48))'
docker run --rm crossbound-backend:你的构建标签 python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

若无 SMTP 配置，网页报告仍可使用，但上线沟通不能承诺邮件已发出。

## 创建与执行 Job

Pipeline → Pipeline script from SCM → Git → Codeup 仓库 URL（公司授权的拉取凭证）→ `*/main` → Script Path `Jenkinsfile`。

首次 `DEPLOY=false`：只执行拉代码 → 前端测试/打包 → 后端镜像构建/配置测试 → 归档前端压缩包及 SHA256。镜像留在该 agent 本机，标签为 `crossbound-backend:构建号-提交号`，不会推到未知镜像仓库。

基础设施齐备后：设置正确 DEPLOY_NODE，`DEPLOY=true`；首次建表或有新迁移时设 `RUN_MIGRATIONS=true`。流水线明确检查库名必须为 `au-crossbound`；迁移账号和运行账号的 HOST/PORT/DATABASE 必须一致，否则拒绝执行。建库本身由 DBA 完成，应用迁移不自动创建公司数据库。

发布步骤：验证真实配置和 DB 连通 → 可选应用001–004迁移 → 检查迁移校验和及16张表/6个视图存在 → 用新镜像启动 backend/worker → 验证健康 → 切换静态版本链接 → 验证正式域名页面及 API。

发布时将运行配置以0600权限保存到 `/data/crossbound/config/runtime.env`，不会被归档到 Jenkins artifacts，也不进入前端或镜像。迁移凭证仅用 Jenkins 临时文件。旧配置快照留在同一受限目录用于回退，按公司保留策略清理。

## 发布失败与维护

- 配置缺失、模板未替换、数据库不可达或版本不匹配：发布前失败，先修复失败项。
- 新后端或公开地址检查失败：有旧版本时尝试恢复旧镜像/运行配置/静态链接；无旧版本时明确失败并保留容器供诊断。
- **数据库迁移不自动回滚**。新增迁移需考虑旧应用兼容；不兼容变更按备份和维护窗口处理。保留上次镜像，不执行全局 Docker prune。
- `up --wait` 验证后端健康及 worker 运行状态，不等于 SMTP 已实际成功送达；上线验收仍需验证真实收信。
- 现有4个迁移文件不可修改；新增字段必须追加版本文件，并同步检查合同及测试。
- 发布完成后工程侧走一轮游戏、提交反馈/留资，并在管理端核实；不要向生产库插入自动测试用户。

手动维护服务（在部署主机，使用已保存的配置）：

```sh
export CROSSBOUND_ENV_FILE=/data/crossbound/config/runtime.env
export CROSSBOUND_IMAGE=$(cat /data/crossbound/config/current-image.txt)
docker compose --project-name crossbound -f /data/crossbound/config/compose.yaml ps
curl --fail http://127.0.0.1:5017/crossbound/api/health
```

## 验证依据与限制

本地可验证 Docker 镜像、配置校验、MySQL迁移和数据写入、脚本语法。公司 Jenkins 的插件/agent、生产 RDS 权限/VPC、HTTPS 与真实 SMTP 需要工程侧联调，不能用本机通过代替生产验收。

实现参考：[Jenkins 凭证绑定](https://www.jenkins.io/doc/pipeline/steps/credentials-binding/)、[Pipeline 语法](https://www.jenkins.io/doc/book/pipeline/syntax/)、[Docker Compose env_file](https://docs.docker.com/reference/compose-file/services/#env_file)。
