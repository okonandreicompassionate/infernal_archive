import React, { useEffect, useState } from "react";
import {
  Check,
  LockKeyhole,
  Settings,
  UserRound,
  UserX,
  Trash2,
} from "lucide-react";
import { authorizedFetch, supabase, type UserRole } from "../utils/supabase";

interface SettingsPageProps {
  userId: string;
  email?: string;
  displayName: string;
  role: UserRole | null;
  onDisplayNameChange: (name: string) => void;
}

type ManagedUser = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  userId,
  email,
  displayName,
  role,
  onDisplayNameChange,
}) => {
  const [name, setName] = useState(displayName);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [providerKeys, setProviderKeys] = useState({
    groq: "",
    gemini: "",
  });
  const [activeProvider, setActiveProvider] = useState<"groq" | "gemini">(
    "groq",
  );
  const [providerKeyStatus, setProviderKeyStatus] = useState<{
    groq: Array<{
      key: string;
      label: string;
      status: string;
      remainingMs: number;
    }>;
    gemini: Array<{
      key: string;
      label: string;
      status: string;
      remainingMs: number;
    }>;
  }>({
    groq: [],
    gemini: [],
  });
  const [keyMessage, setKeyMessage] = useState("");

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  const refreshProviderKeyState = async () => {
    const response = await fetch("/api/ai/provider-keys");
    if (!response.ok) return null;

    const data = await response.json();
    setActiveProvider(data.activeProvider === "gemini" ? "gemini" : "groq");
    setProviderKeyStatus({
      groq: data.providers?.groq || [],
      gemini: data.providers?.gemini || [],
    });
    setProviderKeys({
      groq: (data.providers?.groq || [])
        .map((item: any) => `${item.label || "Key"} | ${item.key}`)
        .join("\n"),
      gemini: (data.providers?.gemini || [])
        .map((item: any) => `${item.label || "Key"} | ${item.key}`)
        .join("\n"),
    });

    return data;
  };

  useEffect(() => {
    if (role !== "god") return;
    authorizedFetch("/api/admin/users").then(async (response) => {
      if (response.ok) setUsers(await response.json());
    });
    refreshProviderKeyState().catch(() => undefined);
  }, [role]);

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    const { error } = await supabase!
      .from("profiles")
      .update({ display_name: name.trim() })
      .eq("id", userId);
    if (!error) {
      onDisplayNameChange(name.trim());
      setMessage("Profile saved.");
    } else {
      setMessage("Profile changes could not be saved.");
    }
  };

  const toggleUser = async (managedUser: ManagedUser) => {
    const response = await authorizedFetch(
      `/api/admin/users/${managedUser.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !managedUser.active }),
      },
    );
    if (response.ok) {
      const updated = await response.json();
      setUsers((current) =>
        current.map((user) => (user.id === updated.id ? updated : user)),
      );
    }
  };

  const deleteUser = async (managedUser: ManagedUser) => {
    if (
      !window.confirm(
        `Delete ${managedUser.email}? This removes the Auth account and profile. The email can then be invited again.`,
      )
    )
      return;
    const response = await authorizedFetch(
      `/api/admin/users/${managedUser.id}`,
      { method: "DELETE" },
    );
    if (response.ok) {
      setUsers((current) =>
        current.filter((user) => user.id !== managedUser.id),
      );
    } else {
      const result = await response.json().catch(() => ({}));
      setMessage(result.error || "Admin could not be deleted.");
    }
  };

  const saveProviderKeys = async (provider: "groq" | "gemini") => {
    const parsedEntries = providerKeys[provider]
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const splitIndex = line.indexOf("|");
        const keyPart =
          splitIndex >= 0 ? line.slice(splitIndex + 1).trim() : line;
        const labelPart =
          splitIndex >= 0 ? line.slice(0, splitIndex).trim() : "Key";
        return {
          key: keyPart,
          label: labelPart || "Key",
        };
      })
      .filter((entry) => entry.key);

    const response = await fetch("/api/ai/provider-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        entries: parsedEntries,
        manualProvider: activeProvider,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setKeyMessage(result.error || "Could not update provider keys.");
      return;
    }

    await refreshProviderKeyState();
    setProviderKeyStatus((current) => ({
      ...current,
      [provider]: result.keys || [],
    }));
    setKeyMessage(
      `${provider.toUpperCase()} keys saved to disk and reloaded from the server.`,
    );
    setActiveProvider(result.activeProvider === "gemini" ? "gemini" : "groq");
  };

  return (
    <div className="settings-page">
      <div className="settings-heading">
        <div>
          <p className="auth-kicker">WORKSPACE / SETTINGS</p>
          <h1>Settings</h1>
          <p>Manage your profile and studio access.</p>
        </div>
        <Settings />
      </div>
      <section className="settings-grid">
        <article className="settings-panel">
          <div className="settings-panel-heading">
            <UserRound />
            <div>
              <h2>Your profile</h2>
              <p>Shown in the workspace header and activity logs.</p>
            </div>
          </div>
          <form onSubmit={saveName} className="settings-form">
            <label>
              Nickname
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                required
              />
            </label>
            <label>
              Email
              <input value={email || ""} disabled />
            </label>
            <div className="settings-actions">
              <button type="submit">
                <Check /> Save changes
              </button>
              {message && <span>{message}</span>}
            </div>
          </form>
        </article>
        <article className="settings-panel">
          <div className="settings-panel-heading">
            <LockKeyhole />
            <div>
              <h2>Access level</h2>
              <p>Your current permissions in this workspace.</p>
            </div>
          </div>
          <div className="role-display">
            <strong>{role === "god" ? "God account" : "Admin account"}</strong>
            <span>
              {role === "god"
                ? "Can invite and deactivate admins."
                : "Can edit workspace content."}
            </span>
          </div>
        </article>
      </section>
      {role === "god" && (
        <>
          <section className="settings-panel admin-management">
            <div className="settings-panel-heading">
              <LockKeyhole />
              <div>
                <h2>AI key pool</h2>
                <p>
                  Add comma-separated keys for Groq or Gemini. Exhausted keys
                  auto-cool down and the next valid key rotates in
                  automatically.
                </p>
              </div>
            </div>
            <div className="settings-form" style={{ gap: "1rem" }}>
              <label>
                Active AI provider
                <select
                  value={activeProvider}
                  onChange={(event) =>
                    setActiveProvider(
                      event.target.value === "gemini" ? "gemini" : "groq",
                    )
                  }
                >
                  <option value="groq">Groq</option>
                  <option value="gemini">Gemini</option>
                </select>
              </label>

              <label>
                Groq keys
                <textarea
                  value={providerKeys.groq}
                  onChange={(event) =>
                    setProviderKeys((current) => ({
                      ...current,
                      groq: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Main Groq | gsk_xxx
Backup Groq | gsk_yyy"
                />
              </label>
              <div className="settings-actions">
                <button type="button" onClick={() => saveProviderKeys("groq")}>
                  Save Groq keys
                </button>
              </div>
              <div className="managed-users">
                {providerKeyStatus.groq.map((item) => (
                  <div
                    className="managed-user"
                    key={`${item.label}-${item.key}`}
                  >
                    <div>
                      <strong>{item.label || "Key"}</strong>
                      <span>
                        {item.key.slice(0, 8)}... ·{" "}
                        {item.status === "ready"
                          ? "Ready"
                          : `Cooling down: ${Math.ceil(item.remainingMs / 1000)}s`}
                      </span>
                    </div>
                  </div>
                ))}
                {providerKeyStatus.groq.length === 0 && (
                  <p className="settings-empty">No Groq keys configured.</p>
                )}
              </div>

              <label>
                Gemini keys
                <textarea
                  value={providerKeys.gemini}
                  onChange={(event) =>
                    setProviderKeys((current) => ({
                      ...current,
                      gemini: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Work Gemini | AIza...
Personal Gemini | AIza..."
                />
              </label>
              <div className="settings-actions">
                <button
                  type="button"
                  onClick={() => saveProviderKeys("gemini")}
                >
                  Save Gemini keys
                </button>
              </div>
              <div className="managed-users">
                {providerKeyStatus.gemini.map((item) => (
                  <div
                    className="managed-user"
                    key={`${item.label}-${item.key}`}
                  >
                    <div>
                      <strong>{item.label || "Key"}</strong>
                      <span>
                        {item.key.slice(0, 8)}... ·{" "}
                        {item.status === "ready"
                          ? "Ready"
                          : `Cooling down: ${Math.ceil(item.remainingMs / 1000)}s`}
                      </span>
                    </div>
                  </div>
                ))}
                {providerKeyStatus.gemini.length === 0 && (
                  <p className="settings-empty">No Gemini keys configured.</p>
                )}
              </div>
              {keyMessage && <span>{keyMessage}</span>}
            </div>
          </section>
          <section className="settings-panel admin-management">
            <div className="settings-panel-heading">
              <UserX />
              <div>
                <h2>Admin access</h2>
                <p>
                  Invite new admins from the people button. Deactivated admins
                  cannot access the workspace.
                </p>
              </div>
            </div>
            <div className="managed-users">
              {users
                .filter((user) => user.role === "admin")
                .map((user) => (
                  <div className="managed-user" key={user.id}>
                    <div>
                      <strong>{user.display_name || user.email}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="managed-user-actions">
                      <button
                        onClick={() => toggleUser(user)}
                        className={
                          user.active ? "danger-button" : "restore-button"
                        }
                      >
                        {user.active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        className="delete-button"
                        title="Delete admin account"
                      >
                        <Trash2 /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              {users.filter((user) => user.role === "admin").length === 0 && (
                <p className="settings-empty">No invited admins yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
