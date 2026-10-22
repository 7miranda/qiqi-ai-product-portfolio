// Linux Jenkins agent ON THE DEPLOYMENT HOST, using its local Docker daemon.
// DEPLOY=false builds/archives only. See deploy/JENKINS.md before enabling deployment.
pipeline {
    agent { label "${params.DEPLOY_NODE ?: 'crossbound-deploy'}" }
    options {
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    }
    environment {
        COMPOSE_DISABLE_ENV_FILE = 'true'
    }
    parameters {
        string(name: 'DEPLOY_NODE', defaultValue: 'crossbound-deploy', description: '工程同事填写：目标服务器上的专用 Linux Jenkins agent 标签')
        booleanParam(name: 'DEPLOY', defaultValue: false, description: '发布到该节点；默认只构建归档')
        booleanParam(name: 'RUN_MIGRATIONS', defaultValue: false, description: '先执行尚未应用的 MySQL 迁移；须已建库并完成备份')
        string(name: 'APP_ENV_CREDENTIAL_ID', defaultValue: 'crossbound-prod-env', description: 'Secret file：填写好的 deploy/.env.example')
        string(name: 'MIGRATION_ENV_CREDENTIAL_ID', defaultValue: 'crossbound-prod-migration-env', description: 'Secret file：填写好的 deploy/migration.env.example')
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.RELEASE_ID = "${env.BUILD_NUMBER}-${sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()}"
                    env.CROSSBOUND_IMAGE = "crossbound-backend:${env.RELEASE_ID}"
                }
            }
        }
        stage('Toolchain') {
            steps {
                sh '''#!/usr/bin/env bash
set -euo pipefail
node -e 'if(Number(process.versions.node.split(".")[0])<22)process.exit(1)'
docker info >/dev/null
version=$(docker compose version --short | sed 's/^v//')
test "$(printf '%s\n' 2.30.0 "$version" | sort -V | head -n1)" = 2.30.0
for script in deploy/*.sh; do bash -n "$script"; done
'''
            }
        }
        stage('Frontend test and build') {
            steps {
                sh 'npm ci --include=dev && npm test && npm run build'
                sh 'tar -czf crossbound-frontend.tar.gz -C dist crossbound && sha256sum crossbound-frontend.tar.gz > crossbound-frontend.sha256'
                archiveArtifacts artifacts: 'crossbound-frontend.tar.gz,crossbound-frontend.sha256', fingerprint: true
            }
        }
        stage('Backend image and configuration tests') {
            steps {
                sh '''#!/usr/bin/env bash
set -euo pipefail
docker build -t "$CROSSBOUND_IMAGE" .
docker run --rm --mount "type=bind,src=$WORKSPACE/tests,dst=/tests,readonly" "$CROSSBOUND_IMAGE" python -m unittest discover -s /tests -p test_deployment_config.py -v
docker run --rm --user 0:0 --tmpfs /data -e CROSSBOUND_ISOLATED_RELEASE_TEST=1 --mount "type=bind,src=$WORKSPACE/tests,dst=/tests,readonly" --mount "type=bind,src=$WORKSPACE/deploy,dst=/release-source,readonly" "$CROSSBOUND_IMAGE" python -m unittest discover -s /tests -p test_deployment_release.py -v
printf '%s\n' "$CROSSBOUND_IMAGE" > crossbound-image.txt
'''
                archiveArtifacts artifacts: 'crossbound-image.txt', fingerprint: true
            }
        }
        stage('Validate runtime credentials and database') {
            when { expression { params.DEPLOY } }
            steps {
                withCredentials([file(credentialsId: params.APP_ENV_CREDENTIAL_ID, variable: 'APP_ENV_FILE')]) {
                    sh 'bash deploy/preflight.sh runtime'
                }
            }
        }
        stage('Database migrations') {
            when { expression { params.DEPLOY && params.RUN_MIGRATIONS } }
            steps {
                withCredentials([
                    file(credentialsId: params.APP_ENV_CREDENTIAL_ID, variable: 'APP_ENV_FILE'),
                    file(credentialsId: params.MIGRATION_ENV_CREDENTIAL_ID, variable: 'MIGRATION_ENV_FILE')
                ]) {
                    sh 'bash deploy/preflight.sh migrate'
                }
            }
        }
        stage('Deploy and verify') {
            when { expression { params.DEPLOY } }
            steps {
                withCredentials([file(credentialsId: params.APP_ENV_CREDENTIAL_ID, variable: 'APP_ENV_FILE')]) {
                    sh 'bash deploy/release.sh'
                }
            }
        }
    }
    post {
        success { echo '构建完成。仅 DEPLOY=true 且发布阶段通过，才代表已发布。' }
        failure { echo '流水线失败：按失败阶段排查。不要输出凭证文件或 docker inspect 的环境变量。' }
    }
}
