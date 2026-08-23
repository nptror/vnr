import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const PIN = process.argv[2] || "1986";
console.log("[1] findGameByPin", PIN);
const { data: game, error: gErr } = await supabase
  .from("games")
  .select("*")
  .eq("pin", PIN)
  .neq("status", "finished")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
if (gErr) throw gErr;
if (!game) {
  console.log("NO ACTIVE GAME for pin", PIN, "— nothing to probe. Open Host first.");
  process.exit(0);
}
console.log("    gameId =", game.id, "status =", game.status);

const { data: st0, error: sErr } = await supabase
  .from("game_state")
  .select("revision, phase, active_card_num, card_deck, effect_deck")
  .eq("game_id", game.id)
  .single();
if (sErr) throw sErr;
console.log("[2] current state: revision =", st0.revision, "phase =", st0.phase,
  "active_card_num =", st0.active_card_num,
  "card_deck items =", Array.isArray(st0.card_deck) ? st0.card_deck.length : typeof st0.card_deck);

let received = null;
const channel = supabase
  .channel(`probe:${game.id}`)
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "game_state", filter: `game_id=eq.${game.id}` },
    (payload) => { received = payload; }
  )
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "game_events", filter: `game_id=eq.${game.id}` },
    () => { received = received || { type: "events-insert" }; }
  );

await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("subscribe timeout")), 8000);
  channel.subscribe((status) => {
    console.log("    channel status:", status);
    if (status === "SUBSCRIBED") { clearTimeout(t); resolve(); }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { clearTimeout(t); reject(new Error(status)); }
  });
});
console.log("[3] subscribed to realtime");

// Simulate openCard's diff-style write: bump revision + set a marker field.
const R = st0.revision;
const { data: upd, error: uErr } = await supabase
  .from("game_state")
  .update({ revision: R + 1, attempt_label: `probe-${Date.now()}` })
  .eq("game_id", game.id)
  .eq("revision", R)
  .select()
  .maybeSingle();
if (uErr) throw uErr;
console.log("[4] patch update matched rows:", upd ? 1 : 0, upd ? "(revision now " + upd.revision + ")" : "(STALE — someone else wrote first)");

const got = await Promise.race([
  new Promise((r) => {
    const iv = setInterval(() => { if (received) { clearInterval(iv); r(received); } }, 100);
  }),
  new Promise((r) => setTimeout(() => r(null), 5000)),
]);
console.log(got ? "[5] REALTIME BROADCAST RECEIVED ✓ (latency path works)" : "[5] NO BROADCAST within 5s ✗");

await supabase.from("game_events").insert({ game_id: game.id, event_type: "PROBE", payload: {}, created_by: "host-probe" });
const got2 = await Promise.race([
  new Promise((r) => {
    const iv = setInterval(() => { if (received) { clearInterval(iv); r(received); } }, 100);
  }),
  new Promise((r) => setTimeout(() => r(null), 5000)),
]);
console.log(got2 ? "[6] EVENTS INSERT BROADCAST RECEIVED ✓" : "[6] NO EVENTS INSERT BROADCAST ✗");

await channel.unsubscribe();
process.exit(0);
