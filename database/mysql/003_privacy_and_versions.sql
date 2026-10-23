CREATE TABLE collection_deletions (
 user_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 deleted_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE import_batches (
 source_sha256 CHAR(64) PRIMARY KEY,
 counts JSON NOT NULL,
 imported_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB;
