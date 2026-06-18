// Crea (o reusa) dos usuarios de prueba para el E2E:
//   - admin@codigorojo.test   → role admin
//   - cliente@codigorojo.test → role client (sin acceso a /admin)
// Email ya confirmado, listos para login. Idempotente.
//
//   node scripts/seed-test-users.mjs
//
// Requiere que la migración 005 esté aplicada (grants a service_role para
// poder setear el rol en profiles).

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const PASSWORD = "Test1234!";
const USERS = [
  { email: "admin@codigorojo.test", role: "admin", full_name: "Admin Prueba" },
  { email: "cliente@codigorojo.test", role: "client", full_name: "Cliente Prueba" },
];

async function findUser(email) {
  const r = await fetch(`${SB}/auth/v1/admin/users?per_page=200`, { headers: H });
  const j = await r.json();
  return (j.users ?? []).find((u) => u.email === email) ?? null;
}

async function ensureUser({ email, full_name }) {
  let u = await findUser(email);
  if (!u) {
    const r = await fetch(`${SB}/auth/v1/admin/users`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name } }),
    });
    if (!r.ok) throw new Error(`crear ${email}: ${r.status} ${await r.text()}`);
    u = await r.json();
    console.log(`  + creado ${email} (${u.id})`);
  } else {
    console.log(`  = ya existía ${email} (${u.id})`);
  }
  return u;
}

async function setRole(userId, role) {
  // El trigger handle_new_user ya creó la fila en profiles; actualizamos el rol.
  const r = await fetch(`${SB}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ role }),
  });
  if (!r.ok) throw new Error(`set role ${role} en ${userId}: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  if (!rows.length) throw new Error(`profiles no tiene fila para ${userId} (¿falta el trigger handle_new_user?)`);
}

console.log("Sembrando usuarios de prueba…");
for (const spec of USERS) {
  const u = await ensureUser(spec);
  await setRole(u.id, spec.role);
  console.log(`    role=${spec.role} ✓`);
}
console.log(`\nListo. Login con password: ${PASSWORD}`);
console.log("  admin:   admin@codigorojo.test");
console.log("  cliente: cliente@codigorojo.test");
