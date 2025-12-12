// src/app/api/reset-password/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type JsonHeaders = Record<string, string>;

// type minimal pour ce que l’on lit via l’API REST GoTrue
interface MinimalUser {
  id: string;
  email?: string | null;
}

function json(body: unknown, status = 200, extra: JsonHeaders = {}) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

// (facultatif) CORS si appel direct depuis une app/mobile
export async function OPTIONS() {
  return json(null, 200, {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, x-reset-secret, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  });
}

export async function POST(req: Request) {
  try {
    // 🔐 Secret partagé
    const expected = process.env.RESET_SECRET ?? "";
    const got = req.headers.get("x-reset-secret") ?? "";
    if (!expected || got !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { email, newPassword }: { email?: string; newPassword?: string } = await req.json();
    if (!email || !newPassword || newPassword.length < 6) {
      return json({ error: "Bad payload" }, 400);
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Server misconfigured (env missing)" }, 500);
    }

    // 1) Récupérer l’utilisateur par email via l’API REST GoTrue Admin
    const usersRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: serviceRole,
          authorization: `Bearer ${serviceRole}`,
        },
        cache: "no-store",
      }
    );

    if (!usersRes.ok) {
      const txt = await usersRes.text();
      return json({ error: `get user failed: ${txt}` }, usersRes.status);
    }

    const users = (await usersRes.json()) as MinimalUser[]; // tableau d’utilisateurs
    if (!Array.isArray(users) || users.length === 0) {
      return json({ error: "Email inconnu" }, 404);
    }

    // Sécurise l’égalité en minuscule (au cas où)
    const user =
      users.find(
        (u: MinimalUser) => (u.email ?? "").toLowerCase() === email.toLowerCase()
      ) ?? users[0];

    const userId = user.id;

    // 2) Mise à jour du mot de passe via supabase-js (Admin API)
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updErr) {
      return json({ error: updErr.message }, 400);
    }

    return json({ ok: true, user_id: userId }, 200);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
}
