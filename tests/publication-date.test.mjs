import assert from "node:assert/strict";
import { test } from "node:test";
import { getPublicationDate } from "../lib/publication-date.mjs";

test("publication day changes at Shanghai midnight, not UTC midnight", () => {
  assert.equal(getPublicationDate(new Date("2026-11-07T15:59:59Z"), undefined), "2026-11-07");
  assert.equal(getPublicationDate(new Date("2026-11-07T16:00:00Z"), undefined), "2026-11-08");
  assert.equal(getPublicationDate(new Date("2026-12-05T16:00:00Z"), undefined), "2026-12-06");
});

test("a fixed build date is deterministic and accepts real leap days", () => {
  assert.equal(getPublicationDate(new Date("2000-01-01Z"), "2026-11-08"), "2026-11-08");
  assert.equal(getPublicationDate(new Date(), "2028-02-29"), "2028-02-29");
});

test("malformed or impossible build dates fail instead of silently publishing", () => {
  for (const value of ["", "2026-2-01", "2026-02-29", "2026-04-31", "2026-13-01", "2026-11-08T00:00:00Z"]) {
    assert.throws(() => getPublicationDate(new Date(), value), /valid YYYY-MM-DD/);
  }
});
