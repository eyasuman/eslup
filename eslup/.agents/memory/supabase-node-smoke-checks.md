---
name: Supabase Node smoke checks
description: Environment-specific details for safe ad-hoc Supabase reads from the API workspace.
---

When running a one-off Supabase query from Node in this project, execute it from the API workspace and provide the `ws` package as the Realtime transport on Node 20. The appointments table uses camelCase column names, while the calls and video_sessions tables use snake_case.

**Why:** The API already supplies a WebSocket transport, but a plain Node 20 script fails while constructing the Supabase client; assuming snake_case for appointments also produces misleading missing-column errors.

**How to apply:** Use the API workspace’s installed dependencies, set `realtime: { transport: WebSocket }`, and inspect a row’s keys before composing read-only filters against unfamiliar Supabase tables.