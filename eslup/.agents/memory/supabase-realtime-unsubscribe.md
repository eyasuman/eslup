---
name: Supabase JS realtime channel.unsubscribe() pitfall
description: Why calling channel.unsubscribe() alone can crash on remount, and the fix
---

Calling `channel.unsubscribe()` on a `@supabase/supabase-js` realtime channel tears down
the socket subscription but does **not** remove the channel object from the client's
internal channel registry. If the same channel topic/name is created again on remount
(e.g. React Native screen remount, React StrictMode double-invoke, or navigating back to
a screen), `supabase.channel(...)` can return/reuse the stale, already-"subscribed"
channel instance, and calling `.on()`/`.subscribe()` on it throws or silently no-ops.

**Why:** discovered while debugging a hard crash on opening a provider tab/appointments
screen in an Expo app — remounting a screen that set up a realtime channel crashed with
an error from `.on()`, traced to a reused stale channel object.

**How to apply:** always deregister with `supabase.removeChannel(channel)` (not just
`channel.unsubscribe()`) in cleanup/unmount code for any realtime subscription. Wrap this
in a small helper (e.g. `unsubscribeChannel(channel)`) and use it at every unsubscribe call
site instead of calling `.unsubscribe()` directly.
