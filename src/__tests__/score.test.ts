import { test } from "node:test";
import assert from "node:assert/strict";
import { obsoleteScore } from "../score.js";

test("obsoleteScore is highest for zero references, old, undocumented, no dependents", () => {
  const score = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: 400, hasDocumentation: false, dependentCount: 0 });
  assert.equal(score, 100);
});

test("obsoleteScore is lowest for many references, recently modified, documented, with dependents", () => {
  const score = obsoleteScore({ referenceCount: 10, lastModifiedDaysAgo: 1, hasDocumentation: true, dependentCount: 2 });
  assert.equal(score, 0);
});

test("obsoleteScore decreases as reference count increases", () => {
  const zero = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: 100, hasDocumentation: false, dependentCount: 0 });
  const one = obsoleteScore({ referenceCount: 1, lastModifiedDaysAgo: 100, hasDocumentation: false, dependentCount: 0 });
  const many = obsoleteScore({ referenceCount: 10, lastModifiedDaysAgo: 100, hasDocumentation: false, dependentCount: 0 });
  assert.ok(zero > one);
  assert.ok(one > many);
});

test("obsoleteScore treats unknown last-modified date as a moderate age signal", () => {
  const withUnknownAge = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: null, hasDocumentation: false, dependentCount: 0 });
  const withRecentAge = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: 1, hasDocumentation: false, dependentCount: 0 });
  const withOldAge = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: 400, hasDocumentation: false, dependentCount: 0 });
  assert.ok(withUnknownAge > withRecentAge);
  assert.ok(withUnknownAge < withOldAge);
});

test("obsoleteScore lowers the score for documented code", () => {
  const documented = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: 100, hasDocumentation: true, dependentCount: 0 });
  const undocumented = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: 100, hasDocumentation: false, dependentCount: 0 });
  assert.ok(documented < undocumented);
});

test("obsoleteScore never goes below 0 or above 100", () => {
  const min = obsoleteScore({ referenceCount: 999, lastModifiedDaysAgo: 0, hasDocumentation: true, dependentCount: 5 });
  const max = obsoleteScore({ referenceCount: 0, lastModifiedDaysAgo: 10000, hasDocumentation: false, dependentCount: 0 });
  assert.ok(min >= 0);
  assert.ok(max <= 100);
});
