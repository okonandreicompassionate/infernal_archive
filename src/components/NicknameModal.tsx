import React, { useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { updateProfileName } from "../utils/supabase";

export const NicknameModal: React.FC<{
  userId: string;
  onSaved: (name: string) => void;
}> = ({ userId, onSaved }) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return setError("Add a nickname to continue.");
    setSaving(true);
    const result = await updateProfileName(userId, trimmedName);
    setSaving(false);
    if (result.error)
      return setError(
        `${result.error.message} Run the latest profiles SQL to enable nickname updates.`,
      );
    onSaved(trimmedName);
  };

  return (
    <div className="modal-backdrop">
      <section className="invite-modal nickname-modal">
        <div className="auth-mark">
          <UserRound />
        </div>
        <p className="auth-kicker">FIRST VISIT / PROFILE</p>
        <h2>What should we call you?</h2>
        <p className="auth-copy">
          Choose the name that should appear across your workspace.
        </p>
        <form onSubmit={save} className="auth-form">
          <label>
            Nickname
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              maxLength={40}
              required
            />
          </label>
          {error && <p className="auth-message">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Continue"} <ArrowRight />
          </button>
        </form>
      </section>
    </div>
  );
};
