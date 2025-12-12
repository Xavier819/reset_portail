// src/app/api/reset-password/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extra,
    },
  });
}

export async function OPTIONS() {
  return json(null, 200, {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  });
}

export async function POST(req: Request) {
  try {
    const allowed = process.env.ALLOWED_ORIGIN ?? ""; // ex: https://reset-liart.vercel.app
    const origin = req.headers.get("origin") ?? "";
    const referer = req.headers.get("referer") ?? "";
    if (allowed && !origin.startsWith(allowed) && !referer.startsWith(allowed)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { email, newPassword } = (await req.json()) as {
      email?: string;
      newPassword?: string;
    };

    if (!email || !newPassword || newPassword.length < 6) {
      return json({ error: "Bad payload" }, 400);
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRole) {
      return json({ error: "Server misconfigured (env missing)" }, 500);
    }

    // 1) Lookup user (REST GoTrue Admin)
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

    const users: Array<{ id: string; email?: string }> = await usersRes.json();
    if (!Array.isArray(users) || users.length === 0) {
      return json({ error: "Email inconnu" }, 404);
    }
    const user =
      users.find(
        (u) => u.email?.toLowerCase() === String(email).toLowerCase()
      ) ?? users[0];

    // 2) Update password (Admin API)
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (updErr) return json({ error: updErr.message }, 400);

    return json({ ok: true, user_id: user.id }, 200);
  } catch (err: unknown) {
    // ✅ pas de any
    return json(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
}
