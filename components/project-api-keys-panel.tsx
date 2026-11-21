"use client";

import { FormEvent, useEffect, useState } from "react";

type ApiKeyRecord = {
  id: string;
  projectId: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export default function ProjectApiKeysPanel({ projectId }: { projectId: string }) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [name, setName] = useState("");
  const [newRawKey, setNewRawKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadKeys() {
      try {
        const response = await fetch(`/api/projects/${projectId}/api-keys`);
        const body = (await response.json().catch(() => null)) as
          | ApiKeyRecord[]
          | { error?: string }
          | null;

        if (!response.ok || !Array.isArray(body)) {
          throw new Error(
            body && !Array.isArray(body)
              ? body.error || "Unable to load API keys."
              : "Unable to load API keys.",
          );
        }

        if (active) {
          setKeys(body);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load API keys.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadKeys();

    return () => {
      active = false;
    };
  }, [projectId]);

  async function handleCreateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setError("");
    setCreating(true);
    setNewRawKey("");

    try {
      const response = await fetch(`/api/projects/${projectId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const body = (await response.json().catch(() => null)) as {
        apiKey?: ApiKeyRecord;
        rawKey?: string;
        error?: string;
      } | null;

      if (!response.ok || !body?.apiKey || !body.rawKey) {
        throw new Error(body?.error || "Unable to create API key.");
      }

      setKeys((prev) => [body.apiKey!, ...prev]);
      setNewRawKey(body.rawKey);
      setName("");
      setCopied(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create API key.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    setError("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/api-keys?keyId=${encodeURIComponent(keyId)}`,
        { method: "DELETE" },
      );

      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error || "Unable to revoke API key.");
      }

      setKeys((prev) =>
        prev.map((key) =>
          key.id === keyId ? { ...key, revokedAt: new Date().toISOString() } : key,
        ),
      );
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Unable to revoke API key.");
    }
  }

  async function copyRawKey() {
    if (!newRawKey) return;
    try {
      await navigator.clipboard.writeText(newRawKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-semibold text-slate-950">Programmatic API Keys</h2>
      <p className="mt-1 text-xs text-slate-500">
        Create scoped keys for submitting feedback via <code>POST /api/v1/feedback</code>.
      </p>

      <form onSubmit={handleCreateKey} className="mt-4 flex items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Key name (e.g. CI Reporter)"
          maxLength={100}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-950 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create Key"}
        </button>
      </form>

      {newRawKey && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <p className="font-medium text-emerald-900">
            Copy this API key now — it will not be shown again:
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-slate-900">
              {newRawKey}
            </code>
            <button
              type="button"
              onClick={copyRawKey}
              className="shrink-0 rounded border border-emerald-300 bg-white px-2.5 py-1 font-medium text-emerald-800 hover:bg-emerald-100"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-xs text-slate-500">Loading API keys…</p>
      ) : keys.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">No API keys created for this project yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {key.name}{" "}
                  <code className="ml-1 font-normal text-slate-500">{key.keyPrefix}…</code>
                </p>
                <p className="mt-0.5 text-slate-400">
                  {key.revokedAt
                    ? `Revoked ${new Date(key.revokedAt).toLocaleDateString()}`
                    : key.lastUsedAt
                      ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : "Never used"}
                </p>
              </div>
              {key.revokedAt ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-500">
                  Revoked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRevoke(key.id)}
                  className="rounded border border-red-200 px-2.5 py-1 font-medium text-red-700 hover:bg-red-50"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
