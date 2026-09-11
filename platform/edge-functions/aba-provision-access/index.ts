import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const PROFESSIONAL_ROLES = new Set(["applicator", "professional", "supervisor", "viewer"]);
const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const validEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

function tempPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%_-+=";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => {
    const a = new Uint32Array(1); crypto.getRandomValues(a); return set[a[0] % set.length];
  };
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rnd = new Uint32Array(18); crypto.getRandomValues(rnd);
  for (const n of rnd) chars.push(all[n % all.length]);
  for (let i = chars.length - 1; i > 0; i--) {
    const a = new Uint32Array(1); crypto.getRandomValues(a); const j = a[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

async function listAuthUsers(admin: any) {
  const out: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const users = data?.users || [];
    out.push(...users);
    if (users.length < 100) break;
  }
  return out;
}
async function userByEmail(admin: any, email: string) {
  const wanted = normalizeEmail(email);
  return (await listAuthUsers(admin)).find((u: any) => normalizeEmail(u.email) === wanted) || null;
}
async function userById(admin: any, userId: string) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  return data?.user || null;
}
async function audit(admin: any, actorId: string, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown> = {}) {
  const { error } = await admin.from("aba_audit_log").insert({ actor_user_id: actorId, action, entity_type: entityType, entity_id: entityId || null, metadata });
  if (error) throw error;
}
async function requireClient(admin: any, clientId: string) {
  const { data, error } = await admin.from("aba_clients").select("id,full_name,preferred_name,active").eq("id", clientId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("client_not_found");
  return data;
}
async function requireGuardianLink(admin: any, body: any) {
  let q = admin.from("aba_guardian_access").select("*");
  if (body.guardian_access_id) q = q.eq("id", String(body.guardian_access_id));
  else {
    const clientId = String(body.client_id || "");
    const email = normalizeEmail(body.email);
    if (!clientId || !email) throw new Error("guardian_identifier_required");
    q = q.eq("client_id", clientId).ilike("guardian_email", email);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("guardian_access_not_found");
  return data;
}
async function requireProfessional(admin: any, professionalId: string) {
  const { data, error } = await admin.from("aba_professionals").select("*").eq("id", professionalId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("professional_not_found");
  if (data.role === "admin") throw new Error("admin_target_not_allowed");
  return data;
}
async function setTemporaryPassword(admin: any, authUser: any, accessKind: string) {
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(authUser.id, {
    password,
    email_confirm: true,
    user_metadata: { ...(authUser.user_metadata || {}), must_change_password: true },
    app_metadata: { ...(authUser.app_metadata || {}), aba_module: true, aba_access_kind: accessKind },
  });
  if (error) throw error;
  return password;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return reply({ error: "server_configuration_error" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user: callerUser }, error: callerError } = await caller.auth.getUser();
    if (callerError || !callerUser) return reply({ error: "unauthorized" }, 401);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: me, error: meError } = await admin.from("aba_professionals").select("id,user_id,role,active").eq("user_id", callerUser.id).eq("active", true).maybeSingle();
    if (meError) throw meError;
    if (!me || me.role !== "admin") return reply({ error: "admin_required" }, 403);

    const body = await req.json();
    const action = String(body?.action || "");

    if (action === "list_guardians") {
      const clientId = String(body.client_id || "");
      if (!clientId) return reply({ error: "client_id_required" }, 400);
      const client = await requireClient(admin, clientId);
      const { data: links, error } = await admin.from("aba_guardian_access").select("id,user_id,client_id,guardian_name,guardian_email,relationship,active,can_view_assessments,can_view_sessions,can_view_programs,created_at,updated_at").eq("client_id", clientId).order("created_at");
      if (error) throw error;
      const authUsers = new Map((await listAuthUsers(admin)).map((u: any) => [u.id, u]));
      const guardians = (links || []).map((g: any) => {
        const u: any = authUsers.get(g.user_id);
        return { ...g, auth_email: u?.email || g.guardian_email || null, email_confirmed_at: u?.email_confirmed_at || null, last_sign_in_at: u?.last_sign_in_at || null, banned_until: u?.banned_until || null, auth_exists: Boolean(u) };
      });
      return reply({ ok: true, client: { id: client.id, name: client.preferred_name || client.full_name, full_name: client.full_name }, guardians });
    }

    if (action === "provision_guardian") {
      const clientId = String(body.client_id || "");
      const email = normalizeEmail(body.email);
      if (!clientId) return reply({ error: "client_id_required" }, 400);
      if (!validEmail(email)) return reply({ error: "email_required" }, 400);
      const client = await requireClient(admin, clientId);
      let authUser = await userByEmail(admin, email);
      let password: string | null = null;
      let created = false;
      if (!authUser) {
        password = tempPassword();
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true }, app_metadata: { aba_module: true, aba_access_kind: "guardian" } });
        if (error) throw error;
        authUser = data.user; created = true;
      }
      if (!authUser) throw new Error("user_creation_failed");
      const { data: existingProfessional, error: epError } = await admin.from("aba_professionals").select("id,role,active").eq("user_id", authUser.id).maybeSingle();
      if (epError) throw epError;
      if (existingProfessional?.active) return reply({ error: "email_linked_to_professional" }, 409);
      const { data: existing, error: exError } = await admin.from("aba_guardian_access").select("id").eq("user_id", authUser.id).eq("client_id", clientId).maybeSingle();
      if (exError) throw exError;
      const payload = { user_id: authUser.id, client_id: clientId, guardian_name: String(body.guardian_name || "").trim() || null, guardian_email: email, relationship: String(body.relationship || "responsável").trim() || "responsável", active: true, can_view_assessments: body.can_view_assessments !== false, can_view_sessions: body.can_view_sessions !== false, can_view_programs: body.can_view_programs !== false, updated_at: new Date().toISOString() };
      let accessId: string;
      if (existing?.id) { const { error } = await admin.from("aba_guardian_access").update(payload).eq("id", existing.id); if (error) throw error; accessId = existing.id; }
      else { const { data, error } = await admin.from("aba_guardian_access").insert(payload).select("id").single(); if (error) throw error; accessId = data.id; }
      await audit(admin, callerUser.id, "provision_access", "guardian", accessId, { client_id: clientId, email, created_auth_user: created });
      return reply({ ok: true, type: "guardian", guardian_access_id: accessId, email, password, existing_user: !created, client_name: client.full_name });
    }

    if (["reset_guardian_password", "revoke_guardian_sessions"].includes(action)) {
      const link = await requireGuardianLink(admin, body);
      const authUser = await userById(admin, link.user_id);
      if (!authUser) return reply({ error: "guardian_user_not_found" }, 404);
      const password = await setTemporaryPassword(admin, authUser, "guardian");
      await admin.from("aba_guardian_access").update({ active: true, updated_at: new Date().toISOString() }).eq("id", link.id);
      await audit(admin, callerUser.id, action === "revoke_guardian_sessions" ? "revoke_sessions_by_password_rotation" : "reset_access_password", "guardian", link.id, { client_id: link.client_id, email: authUser.email });
      return reply({ ok: true, type: "guardian", guardian_access_id: link.id, email: authUser.email, password, existing_user: true, sessions_revoked_by_password_rotation: true });
    }

    if (action === "update_guardian_login") {
      const link = await requireGuardianLink(admin, body);
      const email = normalizeEmail(body.new_email || body.email);
      if (!validEmail(email)) return reply({ error: "email_required" }, 400);
      const authUser = await userById(admin, link.user_id);
      if (!authUser) return reply({ error: "guardian_user_not_found" }, 404);
      const collision = await userByEmail(admin, email);
      if (collision && collision.id !== authUser.id) return reply({ error: "email_already_in_use" }, 409);
      const oldEmail = authUser.email || link.guardian_email || null;
      if (normalizeEmail(oldEmail) !== email) { const { error } = await admin.auth.admin.updateUserById(authUser.id, { email, email_confirm: true }); if (error) throw error; }
      const { error: ge } = await admin.from("aba_guardian_access").update({ guardian_email: email, updated_at: new Date().toISOString() }).eq("id", link.id);
      if (ge) throw ge;
      await audit(admin, callerUser.id, "update_login", "guardian", link.id, { client_id: link.client_id, old_email: oldEmail, new_email: email });
      return reply({ ok: true, type: "guardian", guardian_access_id: link.id, email, user_id: authUser.id });
    }

    if (["deactivate_guardian", "reactivate_guardian"].includes(action)) {
      const link = await requireGuardianLink(admin, body);
      const active = action === "reactivate_guardian";
      const { error } = await admin.from("aba_guardian_access").update({ active, updated_at: new Date().toISOString() }).eq("id", link.id);
      if (error) throw error;
      await audit(admin, callerUser.id, active ? "reactivate_access" : "deactivate_access", "guardian", link.id, { client_id: link.client_id, email: link.guardian_email });
      return reply({ ok: true, type: "guardian", guardian_access_id: link.id, active });
    }

    if (action === "list_professional_access") {
      const professionalId = String(body.professional_id || "");
      if (!professionalId) return reply({ error: "professional_id_required" }, 400);
      const professional = await requireProfessional(admin, professionalId);
      const authUser = professional.user_id ? await userById(admin, professional.user_id) : null;
      return reply({ ok: true, professional: { id: professional.id, user_id: professional.user_id, full_name: professional.full_name, email: professional.email, role: professional.role, active: professional.active, auth_exists: Boolean(authUser), auth_email: authUser?.email || null, email_confirmed_at: authUser?.email_confirmed_at || null, last_sign_in_at: authUser?.last_sign_in_at || null, banned_until: authUser?.banned_until || null } });
    }

    if (["provision_applicator", "provision_professional"].includes(action)) {
      const fullName = String(body.full_name || "").trim();
      const email = normalizeEmail(body.email);
      if (!fullName) return reply({ error: "full_name_required" }, 400);
      if (!validEmail(email)) return reply({ error: "email_required" }, 400);
      const requestedRole = action === "provision_applicator" ? "applicator" : String(body.role || "professional");
      const role = PROFESSIONAL_ROLES.has(requestedRole) ? requestedRole : "professional";
      const clientIds = [...new Set(Array.isArray(body.client_ids) ? body.client_ids.filter((x: any) => typeof x === "string" && x) : [])] as string[];
      let professional: any = null;
      if (body.professional_id) professional = await requireProfessional(admin, String(body.professional_id));
      let authUser: any = null; let created = false; let password: string | null = null;
      if (professional?.user_id) {
        authUser = await userById(admin, professional.user_id);
        if (!authUser) return reply({ error: "linked_auth_user_not_found" }, 409);
        const collision = await userByEmail(admin, email);
        if (collision && collision.id !== authUser.id) return reply({ error: "email_already_in_use" }, 409);
        if (normalizeEmail(authUser.email) !== email) { const { error } = await admin.auth.admin.updateUserById(authUser.id, { email, email_confirm: true }); if (error) throw error; }
      } else {
        authUser = await userByEmail(admin, email);
        if (authUser) {
          const { data: otherProfessional, error: opError } = await admin.from("aba_professionals").select("id").eq("user_id", authUser.id).maybeSingle();
          if (opError) throw opError;
          const { data: guardianLinks, error: glError } = await admin.from("aba_guardian_access").select("id").eq("user_id", authUser.id).eq("active", true).limit(1);
          if (glError) throw glError;
          if ((otherProfessional && otherProfessional.id !== professional?.id) || guardianLinks?.length) return reply({ error: "email_linked_to_another_aba_account" }, 409);
        } else {
          password = tempPassword();
          const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true }, app_metadata: { aba_module: true, aba_access_kind: "professional" } });
          if (error) throw error;
          authUser = data.user; created = true;
        }
      }
      if (!authUser) throw new Error("user_creation_failed");
      const payload = { user_id: authUser.id, full_name: fullName, email, registration: body.registration || null, specialty: body.specialty || (role === "applicator" ? "Aplicador ABA" : "Psicologia / ABA"), role, active: body.active !== false, updated_at: new Date().toISOString() };
      let professionalId = professional?.id || null;
      if (professionalId) { const { error } = await admin.from("aba_professionals").update(payload).eq("id", professionalId); if (error) throw error; }
      else {
        const { data: existingRow, error: erError } = await admin.from("aba_professionals").select("id,role").ilike("email", email).maybeSingle();
        if (erError) throw erError;
        if (existingRow?.role === "admin") return reply({ error: "admin_target_not_allowed" }, 403);
        if (existingRow?.id) { professionalId = existingRow.id; const { error } = await admin.from("aba_professionals").update(payload).eq("id", professionalId); if (error) throw error; }
        else { const { data, error } = await admin.from("aba_professionals").insert(payload).select("id").single(); if (error) throw error; professionalId = data.id; }
      }
      const { data: existingLinks, error: linkError } = await admin.from("aba_client_professionals").select("id,client_id,active").eq("professional_id", professionalId);
      if (linkError) throw linkError;
      const byClient = new Map((existingLinks || []).map((x: any) => [x.client_id, x]));
      for (const clientId of clientIds) {
        await requireClient(admin, clientId);
        const old: any = byClient.get(clientId);
        if (old?.id) { const { error } = await admin.from("aba_client_professionals").update({ active: true, ends_on: null, assignment_role: "professional" }).eq("id", old.id); if (error) throw error; }
        else { const { error } = await admin.from("aba_client_professionals").insert({ client_id: clientId, professional_id: professionalId, assignment_role: "professional", active: true }); if (error) throw error; }
      }
      if (body.sync_client_links === true) {
        const selected = new Set(clientIds);
        for (const old of existingLinks || []) if (old.active && !selected.has(old.client_id)) { const { error } = await admin.from("aba_client_professionals").update({ active: false, ends_on: new Date().toISOString().slice(0, 10) }).eq("id", old.id); if (error) throw error; }
      }
      await audit(admin, callerUser.id, "provision_access", "professional", professionalId, { client_count: clientIds.length, email, role, created_auth_user: created, preserved_user_id: Boolean(professional?.user_id) });
      return reply({ ok: true, type: "professional", role, email, password, existing_user: !created, professional_id: professionalId, user_id: authUser.id, client_count: clientIds.length });
    }

    if (["reset_professional_password", "revoke_professional_sessions"].includes(action)) {
      const professionalId = String(body.professional_id || "");
      if (!professionalId) return reply({ error: "professional_id_required" }, 400);
      const professional = await requireProfessional(admin, professionalId);
      if (!professional.user_id) return reply({ error: "access_not_provisioned" }, 400);
      const authUser = await userById(admin, professional.user_id);
      if (!authUser) return reply({ error: "linked_auth_user_not_found" }, 404);
      const password = await setTemporaryPassword(admin, authUser, "professional");
      await audit(admin, callerUser.id, action === "revoke_professional_sessions" ? "revoke_sessions_by_password_rotation" : "reset_access_password", "professional", professional.id, { email: authUser.email });
      return reply({ ok: true, type: "professional", email: authUser.email, password, existing_user: true, professional_id: professional.id, sessions_revoked_by_password_rotation: true });
    }

    if (["deactivate_professional", "reactivate_professional"].includes(action)) {
      const professionalId = String(body.professional_id || "");
      if (!professionalId) return reply({ error: "professional_id_required" }, 400);
      const professional = await requireProfessional(admin, professionalId);
      const active = action === "reactivate_professional";
      const { error } = await admin.from("aba_professionals").update({ active, updated_at: new Date().toISOString() }).eq("id", professional.id);
      if (error) throw error;
      await audit(admin, callerUser.id, active ? "reactivate_access" : "deactivate_access", "professional", professional.id, { email: professional.email, role: professional.role });
      return reply({ ok: true, type: "professional", professional_id: professional.id, active });
    }

    return reply({ error: "invalid_action" }, 400);
  } catch (error: any) {
    console.error("aba_provision_access_error", error);
    const message = String(error?.message || error || "unknown_error");
    const status = /not_found/.test(message) ? 404 : /required|email_/.test(message) ? 400 : /not_allowed/.test(message) ? 403 : 500;
    return reply({ error: message }, status);
  }
});