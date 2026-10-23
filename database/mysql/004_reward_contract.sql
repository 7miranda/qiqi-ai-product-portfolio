ALTER TABLE reward_claims
 ADD COLUMN reward_type VARCHAR(60),
 ADD COLUMN ref_id VARCHAR(240) CHARACTER SET ascii COLLATE ascii_bin,
 ADD COLUMN created_at VARCHAR(40),
 ADD UNIQUE KEY reward_once (user_id,reward_type);
UPDATE reward_claims SET reward_type=CASE WHEN id LIKE '%:deep' THEN 'deep_feedback_points' ELSE 'feedback_points' END,ref_id=id;
ALTER TABLE events ADD COLUMN payload JSON GENERATED ALWAYS AS (data) STORED;
