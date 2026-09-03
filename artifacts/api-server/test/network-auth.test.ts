import assert from "node:assert/strict";
import test from "node:test";
import { requireAdmin } from "../src/middleware/requireAdmin";

test("admin network guard rejects a request without a bearer token", async () => {
  let statusCode = 200;
  let body: unknown;
  const response = {
    locals: {},
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  };
  let called = false;

  await requireAdmin(
    { headers: {} } as never,
    response as never,
    () => { called = true; },
  );

  assert.equal(statusCode, 401);
  assert.deepEqual(body, { error: "Authentication required" });
  assert.equal(called, false);
});