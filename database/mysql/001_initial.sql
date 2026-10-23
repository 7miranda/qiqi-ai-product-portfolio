-- MySQL 8.0.21+ / InnoDB / utf8mb4. Run against an empty dedicated database.
-- No DROP, sample contacts, passwords or game records are included.
-- Apply once; a re-run intentionally fails rather than silently accepting a mismatched schema.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS schema_migrations (
 name VARCHAR(160) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE users (
 id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 first_seen VARCHAR(40) NOT NULL,
 badge_number VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE events (
  id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data JSON NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  event_name VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.event')),'null')) STORED,
  round_number BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.round'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.round'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.round')),'null') AS SIGNED) END) STORED,
  stage BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.stage'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.stage'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.stage')),'null') AS SIGNED) END) STORED,
  KEY events_user_time (user_id,updated_at),
  CONSTRAINT events_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE round_reports (
  id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data JSON NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  round_number BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.round'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.round'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.round')),'null') AS SIGNED) END) STORED,
  completed BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.completed'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.completed'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.completed')),'null') AS SIGNED) END) STORED,
  exit_stage BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.exit_stage'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.exit_stage'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.exit_stage')),'null') AS SIGNED) END) STORED,
  market VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.market')),'null')) STORED,
  product VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.product')),'null')) STORED,
  channel VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.channel')),'null')) STORED,
  profit DECIMAL(20,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.profit')),'null') AS DECIMAL(20,4))) STORED,
  passed BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.passed'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.passed'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.passed')),'null') AS SIGNED) END) STORED,
  orders BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.orders'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.orders'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.orders')),'null') AS SIGNED) END) STORED,
  refunds BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.refunds'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.refunds'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.refunds')),'null') AS SIGNED) END) STORED,
  kept_orders BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.kept_orders'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.kept_orders'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.kept_orders')),'null') AS SIGNED) END) STORED,
  listing_score DECIMAL(20,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.listing_score')),'null') AS DECIMAL(20,4))) STORED,
  balance_version VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.balance_version')),'null')) STORED,
  goal_version VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.goal_version')),'null')) STORED,
  UNIQUE KEY round_reports_user_round (user_id,round_number),
  CHECK (round_number>=1 AND completed IN (0,1) AND exit_stage BETWEEN 0 AND 6),
  KEY round_reports_user_time (user_id,updated_at),
  CONSTRAINT round_reports_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quiz_answers (
  id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data JSON NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  task_id VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.task_id')),'null')) STORED,
  round_number BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.round'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.round'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.round')),'null') AS SIGNED) END) STORED,
  correct BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.correct'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.correct'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.correct')),'null') AS SIGNED) END) STORED,
  choice VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.choice')),'null')) STORED,
  KEY quiz_task (task_id,correct),
  KEY quiz_answers_user_time (user_id,updated_at),
  CONSTRAINT quiz_answers_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE feedback (
  id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data JSON NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  comment TEXT GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.comment')),'null')) STORED,
  fun_score BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.fun_score'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.fun_score'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.fun_score')),'null') AS SIGNED) END) STORED,
  stuck_step BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.stuck_step'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.stuck_step'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.stuck_step')),'null') AS SIGNED) END) STORED,
  want_most BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.want_most'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.want_most'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.want_most')),'null') AS SIGNED) END) STORED,
  rounds_played BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.rounds_played'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.rounds_played'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.rounds_played')),'null') AS SIGNED) END) STORED,
  feedback_kind VARCHAR(10) GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.deep'))='true' THEN 'deep' ELSE 'first' END) STORED,
  UNIQUE KEY feedback_user_kind (user_id,feedback_kind),
  CHECK (CHAR_LENGTH(TRIM(COALESCE(comment,'')))=0 OR CHAR_LENGTH(TRIM(comment)) BETWEEN 15 AND 100),
  KEY feedback_topics (stuck_step,want_most),
  KEY feedback_user_time (user_id,updated_at),
  CONSTRAINT feedback_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leads (
  id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data JSON NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  email VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.email')),'null')) STORED,
  category VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.category')),'null')) STORED,
  followers VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.followers')),'null')) STORED,
  platform VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.platform')),'null')) STORED,
  wechat VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.wechat')),'null')) STORED,
  score DECIMAL(20,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.score')),'null') AS DECIMAL(20,4))) STORED,
  consent_at VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.consent_at')),'null')) STORED,
  tier VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.tier')),'null')) STORED,
  KEY leads_score (score DESC),
  KEY leads_user_time (user_id,updated_at),
  CONSTRAINT leads_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE assessments (
  id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  data JSON NOT NULL,
  updated_at VARCHAR(40) NOT NULL,
  score DECIMAL(20,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.averageScore')),'null') AS DECIMAL(20,4))) STORED,
  title VARCHAR(255) GENERATED ALWAYS AS (NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.title')),'null')) STORED,
  rounds_played BIGINT GENERATED ALWAYS AS (CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.rounds'))='true' THEN 1 WHEN JSON_UNQUOTE(JSON_EXTRACT(data,'$.rounds'))='false' THEN 0 ELSE CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.rounds')),'null') AS SIGNED) END) STORED,
  KEY assessments_user_time (user_id,updated_at),
  CONSTRAINT assessments_user_fk FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reward_claims (
 id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 points INT NOT NULL CHECK(points>=0),
 FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB;
CREATE TABLE releases (
 version VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 title VARCHAR(120) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at VARCHAR(40),updated_at VARCHAR(40) NOT NULL,
 CHECK(status<>'published' OR published_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE feedback_reviews (
 feedback_id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 status VARCHAR(16) NOT NULL CHECK(status IN ('pending','adopted','rejected')),
 release_version VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin,
 public_summary VARCHAR(200) NOT NULL DEFAULT '',
 internal_note VARCHAR(1000) NOT NULL DEFAULT '',updated_at VARCHAR(40) NOT NULL,
 FOREIGN KEY(feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
 FOREIGN KEY(release_version) REFERENCES releases(version),
 KEY feedback_reviews_release (release_version,status),
 CHECK(status<>'adopted' OR (release_version IS NOT NULL AND CHAR_LENGTH(TRIM(public_summary))>0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE admin_audit (
 id BIGINT PRIMARY KEY AUTO_INCREMENT,action VARCHAR(40) NOT NULL,target_id VARCHAR(240) NOT NULL,
 before_json JSON,after_json JSON NOT NULL,created_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE consent_records (
 id VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 user_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 purpose VARCHAR(80) NOT NULL,policy_version VARCHAR(40) NOT NULL,
 consent_at VARCHAR(40) NOT NULL,withdrawn_at VARCHAR(40),
 FOREIGN KEY(user_id) REFERENCES users(id),UNIQUE KEY consent_once(user_id,purpose,consent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE report_deliveries (
 id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 lead_id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 assessment_id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 channel VARCHAR(16) NOT NULL CHECK(channel IN ('page','email')),
 status VARCHAR(16) NOT NULL CHECK(status IN ('available','pending','sent','failed','disabled')),
 attempts INT NOT NULL DEFAULT 0 CHECK(attempts>=0),last_error TEXT,
 created_at VARCHAR(40) NOT NULL,updated_at VARCHAR(40) NOT NULL,
 FOREIGN KEY(lead_id) REFERENCES leads(id),FOREIGN KEY(assessment_id) REFERENCES assessments(id),
 UNIQUE KEY delivery_once(lead_id,assessment_id,channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE VIEW lead_followup_queue AS
 SELECT l.*,u.badge_number,
 EXISTS(SELECT 1 FROM feedback f WHERE f.user_id=l.user_id AND f.feedback_kind='deep' AND CHAR_LENGTH(TRIM(f.comment))>=15) AS deep_contributor
 FROM leads l JOIN users u ON u.id=l.user_id;
CREATE VIEW feedback_inbox AS
 SELECT f.*,u.badge_number,COALESCE(r.status,'pending') AS review_status,
 r.release_version,r.public_summary,r.internal_note
 FROM feedback f JOIN users u ON u.id=f.user_id LEFT JOIN feedback_reviews r ON r.feedback_id=f.id;
CREATE VIEW round_statistics AS
 SELECT round_number,COUNT(*) AS rounds,AVG(profit) AS average_profit,AVG(passed) AS pass_rate
 FROM round_reports WHERE completed=1 GROUP BY round_number;
CREATE VIEW default_adoption_by_stage AS
 SELECT d.stage_number-1 AS stage,COUNT(*) AS decisions,SUM(d.used_default='true') AS default_count,AVG(CASE d.used_default WHEN 'true' THEN 1 WHEN 'false' THEN 0 END) AS default_rate
 FROM round_reports r,JSON_TABLE(r.data,'$.decisions[*]' COLUMNS(
 stage_number FOR ORDINALITY,used_default VARCHAR(5) PATH '$.used_default' NULL ON EMPTY)) AS d
 GROUP BY d.stage_number;
