import test from "node:test";
import assert from "node:assert/strict";

import { getEntityDescription } from "../src/utils/entitySummary.ts";

test("species overview is used as the readable description", () => {
  assert.equal(
    getEntityDescription({ overview: "A proud skyborne people." }),
    "A proud skyborne people.",
  );
  assert.equal(
    getEntityDescription({ description: "Fallback lore summary." }),
    "Fallback lore summary.",
  );
  assert.equal(
    getEntityDescription({ overview: "", description: "Fallback lore summary." }),
    "Fallback lore summary.",
  );
});
