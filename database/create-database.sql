-- DBA bootstrap only. Run once using an authorized account, before migrations.
-- A hyphen in the schema name requires backticks. No credentials are stored here.
CREATE DATABASE IF NOT EXISTS `au-crossbound`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Provision separate runtime DML and migration DDL accounts using company policy.
-- Runtime grants: SELECT, INSERT, UPDATE, DELETE ON `au-crossbound`.*
-- Migration grants: CREATE, ALTER, INDEX, REFERENCES, CREATE VIEW, DROP,
--                   SELECT, INSERT, UPDATE, DELETE ON `au-crossbound`.*
