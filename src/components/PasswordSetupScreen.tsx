import React, { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { supabase } from "../utils/supabase";

export const PasswordSetupScreen: React.FC = () => {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setMessage("Use at least 8 characters.");
    if (password !== confirmation) return setMessage("Passwords do not match.");
    if (!supabase) return setMessage("Supabase is not configured.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    setMessage(
      error
        ? error.message
        : "Password saved. You can now enter the workspace.",
    );
    if (!error) window.location.assign("/");
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="auth-mark">
          <KeyRound />
        </div>
        <p className="auth-kicker">ACCOUNT SETUP</p>
        <h1>Choose a password.</h1>
        <p className="auth-copy">
          Set your private password to finish activating this account.
        </p>
        <form onSubmit={save} className="auth-form">
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              minLength={8}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={8}
              required
            />
          </label>
          {message && <p className="auth-message">{message}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Set password"} <ArrowRight />
          </button>
        </form>
      </section>
    </main>
  );
};
