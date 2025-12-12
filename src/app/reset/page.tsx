// src/app/reset/page.tsx
"use client";

import { useState } from "react";

export default function ResetPage() {
  const [email, setEmail] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!email || !p1 || !p2) {
      setErr("Remplissez tous les champs.");
      return;
    }
    if (p1.length < 6) {
      setErr("Mot de passe trop court (min. 6).");
      return;
    }
    if (p1 !== p2) {
      setErr("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, newPassword: p1 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(
          data?.error ??
            `Erreur ${res.status} lors de la réinitialisation.`
        );
      } else {
        setMsg("Mot de passe changé. Retournez dans l'app pour vous connecter.");
        setEmail("");
        setP1("");
        setP2("");
      }
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-xl font-semibold mb-1">
          Réinitialiser le mot de passe
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Saisissez l’email de votre compte Wilsoft Go™ et un nouveau mot de passe.
        </p>

        {err && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {err}
          </div>
        )}
        {msg && (
          <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-2 text-sm text-green-700">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Confirmer</label>
            <input
              type="password"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 text-white py-2 font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Patientez…" : "Valider"}
          </button>
        </form>

        <p className="mt-3 text-xs text-gray-500">
          Conseil : ouvrez cette page dans l’app. Une fois le mot
          de passe changé, revenez à l’écran de connexion et authentifiez-vous.
        </p>
      </div>
    </main>
  );
}
