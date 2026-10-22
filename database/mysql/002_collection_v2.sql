-- Contract 2026-10-22. Old questionnaire data stays explicitly versioned.
ALTER TABLE users
 ADD COLUMN anon_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin GENERATED ALWAYS AS (id) STORED,
 ADD COLUMN run_seed BIGINT,
 ADD COLUMN source VARCHAR(255),
 ADD COLUMN game_version VARCHAR(80),
 ADD COLUMN last_seen_at VARCHAR(40),
 ADD COLUMN created_at VARCHAR(40) GENERATED ALWAYS AS (first_seen) STORED;
ALTER TABLE feedback
 ADD COLUMN survey_version VARCHAR(40) GENERATED ALWAYS AS (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(data,'$.survey_version')),'legacy-v1')) STORED,
 ADD COLUMN player_segment VARCHAR(20) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.player_segment'))) STORED,
 ADD COLUMN intent_shift VARCHAR(20) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.intent_shift'))) STORED,
 ADD COLUMN insight_moment VARCHAR(20) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.insight_moment'))) STORED,
 ADD COLUMN free_text TEXT GENERATED ALWAYS AS (comment) STORED,
 ADD COLUMN help_wanted TEXT GENERATED ALWAYS AS (comment) STORED,
 ADD COLUMN app_version VARCHAR(80) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.game_version'))) STORED,
 ADD COLUMN created_at VARCHAR(40) GENERATED ALWAYS AS (updated_at) STORED,
 ADD CONSTRAINT feedback_segment CHECK (player_segment IS NULL OR player_segment IN ('veteran','domestic','newbie','casual')),
 ADD CONSTRAINT feedback_intent CHECK (intent_shift IS NULL OR intent_shift IN ('stronger','awakened','unchanged','deterred')),
 ADD CONSTRAINT feedback_insight CHECK (insight_moment IS NULL OR insight_moment IN ('tax','returns','ads','cashflow')),
 ADD INDEX feedback_v2_segments (survey_version,player_segment,intent_shift);
ALTER TABLE leads
 ADD COLUMN contact_type VARCHAR(10) NOT NULL DEFAULT 'email',
 ADD COLUMN contact_value TEXT GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.contact_value'))) STORED,
 ADD COLUMN contact_hash VARCHAR(64) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.contact_hash'))) STORED,
 ADD COLUMN follower_tier VARCHAR(255) GENERATED ALWAYS AS (followers) STORED,
 ADD COLUMN touchpoint VARCHAR(40) GENERATED ALWAYS AS (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(data,'$.touchpoint')),'report')) STORED,
 ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'new',
 ADD COLUMN created_at VARCHAR(40) GENERATED ALWAYS AS (updated_at) STORED,
 ADD CONSTRAINT lead_status CHECK (status IN ('new','contacted','cooperating','invalid')),
 ADD INDEX lead_contact_lookup (contact_hash);
ALTER TABLE round_reports
 ADD COLUMN round_no BIGINT GENERATED ALWAYS AS (round_number) STORED,
 ADD COLUMN market_id VARCHAR(255) GENERATED ALWAYS AS (market) STORED,
 ADD COLUMN product_id VARCHAR(255) GENERATED ALWAYS AS (product) STORED,
 ADD COLUMN category VARCHAR(80) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.category'))) STORED,
 ADD COLUMN price DECIMAL(20,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.price')),'null') AS DECIMAL(20,4))) STORED,
 ADD COLUMN quantity BIGINT GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.quantity')),'null') AS SIGNED)) STORED,
 ADD COLUMN promotion VARCHAR(80) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.promotion'))) STORED,
 ADD COLUMN fulfillment VARCHAR(80) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data,'$.fulfillment'))) STORED,
 ADD COLUMN rating_after DECIMAL(8,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.rating_after')),'null') AS DECIMAL(8,4))) STORED,
 ADD COLUMN bad_reviews BIGINT GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.bad_reviews')),'null') AS SIGNED)) STORED,
 ADD COLUMN goal_met BIGINT GENERATED ALWAYS AS (passed) STORED,
 ADD COLUMN created_at VARCHAR(40) GENERATED ALWAYS AS (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(data,'$.created_at')),updated_at)) STORED,
 ADD CONSTRAINT report_order_conservation CHECK (orders IS NULL OR refunds IS NULL OR kept_orders IS NULL OR (orders>=0 AND refunds>=0 AND kept_orders>=0 AND orders-refunds=kept_orders));
ALTER TABLE quiz_answers
 ADD COLUMN task_type VARCHAR(20) GENERATED ALWAYS AS (COALESCE(JSON_UNQUOTE(JSON_EXTRACT(data,'$.task_type')),'hq')) STORED,
 ADD COLUMN round_no BIGINT GENERATED ALWAYS AS (round_number) STORED,
 ADD COLUMN choice_id VARCHAR(255) GENERATED ALWAYS AS (choice) STORED,
 ADD COLUMN is_correct BIGINT GENERATED ALWAYS AS (correct) STORED,
 ADD COLUMN created_at VARCHAR(40) GENERATED ALWAYS AS (updated_at) STORED,
 ADD CONSTRAINT quiz_correct CHECK (correct IS NULL OR correct IN (0,1));
ALTER TABLE assessments
 ADD COLUMN total_score DECIMAL(8,4) GENERATED ALWAYS AS (score) STORED,
 ADD COLUMN profit_score DECIMAL(8,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.profit_score')),'null') AS DECIMAL(8,4))) STORED,
 ADD COLUMN stability_score DECIMAL(8,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.stability_score')),'null') AS DECIMAL(8,4))) STORED,
 ADD COLUMN breadth_score DECIMAL(8,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.breadth_score')),'null') AS DECIMAL(8,4))) STORED,
 ADD COLUMN knowledge_score DECIMAL(8,4) GENERATED ALWAYS AS (CAST(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(data,'$.knowledge_score')),'null') AS DECIMAL(8,4))) STORED,
 ADD COLUMN level_title VARCHAR(255) GENERATED ALWAYS AS (title) STORED,
 ADD COLUMN created_at VARCHAR(40) GENERATED ALWAYS AS (updated_at) STORED,
 ADD CONSTRAINT assessment_scores CHECK (score BETWEEN 0 AND 100 AND (profit_score IS NULL OR profit_score BETWEEN 0 AND 100) AND (stability_score IS NULL OR stability_score BETWEEN 0 AND 100) AND (breadth_score IS NULL OR breadth_score BETWEEN 0 AND 100) AND (knowledge_score IS NULL OR knowledge_score BETWEEN 0 AND 100));
ALTER TABLE events
 ADD COLUMN created_at VARCHAR(40) GENERATED ALWAYS AS (updated_at) STORED,
 ADD INDEX events_funnel (event_name,user_id);
CREATE OR REPLACE VIEW lead_followup_queue AS
 SELECT l.*,u.badge_number,
 EXISTS(SELECT 1 FROM feedback f WHERE f.user_id=l.user_id AND f.feedback_kind='deep' AND CHAR_LENGTH(TRIM(f.comment))>=15) AS deep_contributor
 FROM leads l JOIN users u ON u.id=l.user_id
 WHERE NOT EXISTS(SELECT 1 FROM leads newer WHERE newer.user_id=l.user_id AND (newer.updated_at>l.updated_at OR (newer.updated_at=l.updated_at AND newer.id>l.id)));
CREATE OR REPLACE VIEW feedback_inbox AS
 SELECT f.*,u.badge_number,COALESCE(r.status,'pending') AS review_status,r.release_version,r.public_summary,r.internal_note
 FROM feedback f JOIN users u ON u.id=f.user_id LEFT JOIN feedback_reviews r ON r.feedback_id=f.id;
CREATE VIEW questionnaire_segments AS
 SELECT survey_version,player_segment,intent_shift,COUNT(*) AS responses
 FROM feedback WHERE feedback_kind='first' GROUP BY survey_version,player_segment,intent_shift;
CREATE VIEW event_funnel AS
 SELECT event_name,COUNT(*) AS events,COUNT(DISTINCT user_id) AS users FROM events GROUP BY event_name;
