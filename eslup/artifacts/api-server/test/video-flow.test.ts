import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, test } from "node:test";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "node:net";
import { createVideoRouter } from "../src/routes/video";

type Row = Record<string, unknown>;
type TableName = "appointments" | "calls" | "video_sessions";
type QueryResult = { data: Row | Row[] | null; error: null };

const PATIENT_ID = "patient-video-regression";
const DOCTOR_ID = "doctor-video-regression";
const OUTSIDER_ID = "outsider-video-regression";
const APPOINTMENT_ID = "11111111-1111-4111-8111-111111111111";
const REJECTED_APPOINTMENT_ID = "22222222-2222-4222-8222-222222222222";
const EXPIRED_APPOINTMENT_ID = "33333333-3333-4333-8333-333333333333";
const UNVERIFIED_APPOINTMENT_ID = "44444444-4444-4444-8444-444444444444";
const PROVIDER_END_APPOINTMENT_ID = "55555555-5555-4555-8555-555555555555";
const EXPIRED_CALL_ID = "66666666-6666-4666-8666-666666666666";
const UNVERIFIED_CALL_ID = "77777777-7777-4777-8777-777777777777";

class FakeQuery implements PromiseLike<QueryResult> {
  private filters: Array<{
    kind: "eq" | "in" | "gt" | "lte" | "is";
    key: string;
    value: unknown;
  }> = [];
  private operation: "select" | "insert" | "update" = "select";
  private values: Row | Row[] | undefined;
  private returnRows = false;
  private singleRow = false;

  constructor(
    private readonly store: FakeVideoStore,
    private readonly table: TableName,
  ) {}

  select(): this {
    this.returnRows = true;
    return this;
  }

  insert(values: Row | Row[]): this {
    return this.setOperation("insert", values);
  }

  update(values: Row): this {
    return this.setOperation("update", values);
  }

  eq(key: string, value: unknown): this {
    this.filters.push({ kind: "eq", key, value });
    return this;
  }

  in(key: string, value: unknown[]): this {
    this.filters.push({ kind: "in", key, value });
    return this;
  }

  gt(key: string, value: unknown): this {
    this.filters.push({ kind: "gt", key, value });
    return this;
  }

  lte(key: string, value: unknown): this {
    this.filters.push({ kind: "lte", key, value });
    return this;
  }

  is(key: string, value: unknown): this {
    this.filters.push({ kind: "is", key, value });
    return this;
  }

  order(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    this.singleRow = true;
    return this.execute();
  }

  single(): Promise<QueryResult> {
    this.singleRow = true;
    return this.execute();
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult> {
    const rows = this.store.execute(
      this.table,
      this.operation,
      this.filters,
      this.values,
      this.returnRows,
    );
    if (!this.singleRow) return { data: rows, error: null };
    return { data: rows[0] ?? null, error: null };
  }

  setOperation(
    operation: "select" | "insert" | "update",
    values?: Row | Row[],
  ): this {
    this.operation = operation;
    this.values = values;
    return this;
  }
}

class FakeVideoStore {
  private readonly tables: Record<TableName, Row[]> = {
    appointments: [],
    calls: [],
    video_sessions: [],
  };
  private nextId = 1;

  from(table: TableName): FakeQuery {
    return new FakeQuery(this, table);
  }

  seed(table: TableName, row: Row): void {
    this.tables[table].push({ ...row });
  }

  acceptCallAsProvider(callId: string, providerId: string): void {
    const call = this.tables.calls.find((candidate) => candidate.id === callId);
    assert.ok(
      call,
      "the invitation must exist before the provider can accept it",
    );
    assert.equal(call.doctor_id, providerId);
    assert.equal(call.status, "waiting");
    call.status = "accepted";
  }

  get(table: TableName, id: string): Row {
    const row = this.tables[table].find((candidate) => candidate.id === id);
    assert.ok(row, `${table} row ${id} should exist`);
    return row;
  }

  execute(
    table: TableName,
    operation: "select" | "insert" | "update",
    filters: Array<{
      kind: "eq" | "in" | "gt" | "lte" | "is";
      key: string;
      value: unknown;
    }>,
    values: Row | Row[] | undefined,
    returnRows: boolean,
  ): Row[] {
    const rows = this.tables[table];
    if (operation === "insert") {
      const inserts = Array.isArray(values) ? values : [values ?? {}];
      const created = inserts.map((value) => ({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(this.nextId++).padStart(12, "0")}`,
        created_at: new Date().toISOString(),
        ...value,
      }));
      rows.push(...created);
      return returnRows ? created : [];
    }

    const matching = rows.filter((row) =>
      filters.every((filter) => {
        const actual = row[filter.key];
        if (filter.kind === "eq") return actual === filter.value;
        if (filter.kind === "in")
          return (filter.value as unknown[]).includes(actual);
        if (filter.kind === "gt") return String(actual) > String(filter.value);
        if (filter.kind === "lte")
          return String(actual) <= String(filter.value);
        return filter.value === null
          ? actual === null || actual === undefined
          : actual === filter.value;
      }),
    );

    if (operation === "update" && values) {
      for (const row of matching) Object.assign(row, values);
    }
    return returnRows || operation === "select" ? matching : [];
  }
}

function createFakeDb(store: FakeVideoStore) {
  return {
    from(table: TableName) {
      return store.from(table);
    },
  };
}

function appointment(id: string, overrides: Row = {}): Row {
  return {
    id,
    patientId: PATIENT_ID,
    doctorUserId: DOCTOR_ID,
    patientName: "Regression Patient",
    paymentStatus: "verified",
    status: "scheduled",
    serviceType: "video",
    ...overrides,
  };
}

let store: FakeVideoStore;
let server: Server;
let baseUrl: string;

const authenticate: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication required" });
  res.locals.userId = token;
  return next();
};

async function request(
  path: string,
  userId: string,
  body?: Row,
): Promise<{ status: number; json: Row }> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${userId}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  return { status: response.status, json: (await response.json()) as Row };
}

beforeEach(async () => {
  process.env.ZEGO_APP_ID = "123456789";
  process.env.ZEGO_SERVER_SECRET = "12345678901234567890123456789012";
  store = new FakeVideoStore();
  store.seed("appointments", appointment(APPOINTMENT_ID));
  store.seed("appointments", appointment(REJECTED_APPOINTMENT_ID));
  store.seed(
    "appointments",
    appointment(EXPIRED_APPOINTMENT_ID, { status: "expired" }),
  );
  store.seed(
    "appointments",
    appointment(UNVERIFIED_APPOINTMENT_ID, { paymentStatus: "pending" }),
  );
  store.seed("appointments", appointment(PROVIDER_END_APPOINTMENT_ID));
  store.seed("calls", {
    id: EXPIRED_CALL_ID,
    appointment_id: EXPIRED_APPOINTMENT_ID,
    doctor_id: DOCTOR_ID,
    patient_id: PATIENT_ID,
    status: "accepted",
  });
  store.seed("calls", {
    id: UNVERIFIED_CALL_ID,
    appointment_id: UNVERIFIED_APPOINTMENT_ID,
    doctor_id: DOCTOR_ID,
    patient_id: PATIENT_ID,
    status: "accepted",
  });

  const app = express();
  app.use(express.json());
  app.use(
    "/video",
    createVideoRouter({
      getDb: () => createFakeDb(store),
      authenticate,
    }),
  );
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/video`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("verified appointment gives both participants the same room and ends from either side", async () => {
  const invitationResponse = await request("/invitations", PATIENT_ID, {
    appointmentId: APPOINTMENT_ID,
  });
  assert.equal(invitationResponse.status, 200);
  assert.equal(invitationResponse.json.status, "waiting");
  assert.equal(invitationResponse.json.appointment_id, APPOINTMENT_ID);

  const invitationId = String(invitationResponse.json.id);
  store.acceptCallAsProvider(invitationId, DOCTOR_ID);

  const patientSession = await request("/sessions", PATIENT_ID, {
    appointmentId: APPOINTMENT_ID,
    callId: invitationId,
  });
  const providerSession = await request("/sessions", DOCTOR_ID, {
    appointmentId: APPOINTMENT_ID,
    callId: invitationId,
  });
  assert.equal(patientSession.status, 200);
  assert.equal(providerSession.status, 200);
  assert.equal(patientSession.json.roomId, providerSession.json.roomId);
  assert.equal(patientSession.json.sessionId, providerSession.json.sessionId);
  assert.equal(patientSession.json.userName, "Patient");
  assert.equal(providerSession.json.userName, "Provider");

  const patientEnd = await request(
    `/sessions/${String(patientSession.json.sessionId)}/end`,
    PATIENT_ID,
  );
  assert.deepEqual(patientEnd, { status: 200, json: { ended: true } });
  assert.equal(
    store.get("video_sessions", String(patientSession.json.sessionId)).status,
    "ended",
  );
  assert.equal(store.get("calls", invitationId).status, "ended");

  const providerInvitation = await request("/invitations", PATIENT_ID, {
    appointmentId: PROVIDER_END_APPOINTMENT_ID,
  });
  const providerInvitationId = String(providerInvitation.json.id);
  store.acceptCallAsProvider(providerInvitationId, DOCTOR_ID);
  const activeProviderSession = await request("/sessions", DOCTOR_ID, {
    appointmentId: PROVIDER_END_APPOINTMENT_ID,
    callId: providerInvitationId,
  });
  assert.equal(activeProviderSession.status, 200);
  const providerEnd = await request(
    `/sessions/${String(activeProviderSession.json.sessionId)}/end`,
    DOCTOR_ID,
  );
  assert.deepEqual(providerEnd, { status: 200, json: { ended: true } });
  assert.equal(
    store.get("video_sessions", String(activeProviderSession.json.sessionId))
      .status,
    "ended",
  );
  assert.equal(store.get("calls", providerInvitationId).status, "ended");
});

test("rejected, expired, and unverified appointments remain locked", async () => {
  const rejectedInvitation = await request("/invitations", PATIENT_ID, {
    appointmentId: REJECTED_APPOINTMENT_ID,
  });
  assert.equal(rejectedInvitation.status, 200);
  store.acceptCallAsProvider(String(rejectedInvitation.json.id), DOCTOR_ID);
  store.get("calls", String(rejectedInvitation.json.id)).status = "rejected";

  const rejectedSession = await request("/sessions", PATIENT_ID, {
    appointmentId: REJECTED_APPOINTMENT_ID,
    callId: String(rejectedInvitation.json.id),
  });
  assert.equal(rejectedSession.status, 403);

  const expiredInvitation = await request("/invitations", PATIENT_ID, {
    appointmentId: EXPIRED_APPOINTMENT_ID,
  });
  assert.equal(expiredInvitation.status, 403);
  const expiredSession = await request("/sessions", PATIENT_ID, {
    appointmentId: EXPIRED_APPOINTMENT_ID,
    callId: EXPIRED_CALL_ID,
  });
  assert.equal(expiredSession.status, 403);

  const unverifiedInvitation = await request("/invitations", PATIENT_ID, {
    appointmentId: UNVERIFIED_APPOINTMENT_ID,
  });
  assert.equal(unverifiedInvitation.status, 403);
  const unverifiedSession = await request("/sessions", PATIENT_ID, {
    appointmentId: UNVERIFIED_APPOINTMENT_ID,
    callId: UNVERIFIED_CALL_ID,
  });
  assert.equal(unverifiedSession.status, 403);
});

test("invitation and session routes reject the wrong participant", async () => {
  const unauthorizedInvitation = await request("/invitations", DOCTOR_ID, {
    appointmentId: APPOINTMENT_ID,
  });
  assert.equal(unauthorizedInvitation.status, 403);

  const invitationResponse = await request("/invitations", PATIENT_ID, {
    appointmentId: APPOINTMENT_ID,
  });
  const invitationId = String(invitationResponse.json.id);
  store.acceptCallAsProvider(invitationId, DOCTOR_ID);
  const sessionResponse = await request("/sessions", PATIENT_ID, {
    appointmentId: APPOINTMENT_ID,
    callId: invitationId,
  });
  assert.equal(sessionResponse.status, 200);

  const outsiderEnd = await request(
    `/sessions/${String(sessionResponse.json.sessionId)}/end`,
    OUTSIDER_ID,
  );
  assert.equal(outsiderEnd.status, 403);
});
