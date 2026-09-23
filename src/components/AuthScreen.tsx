import React, { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { supabase } from "../utils/supabase";

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const resetPassword = async () => {
    if (!supabase || !email) return setMessage("Enter your email first.");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    setMessage(
      error ? error.message : "Check your email for a password setup link.",
    );
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase)
      return setMessage("Supabase is not configured. Check .env.local.");
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) setMessage(error.message);
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <img
          className="site-logo site-logo-auth"
          src="https://i.imgur.com/iS5wVPz.png"
          alt="Universe Archive"
        />
        <p className="auth-kicker">PRIVATE ACCESS</p>
        <h1>Enter the archive.</h1>
        <p className="auth-copy">
          Sign in with your approved studio account to access the canon
          workspace.
        </p>
        <form onSubmit={signIn} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {message && <p className="auth-message">{message}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Checking credentials..." : "Sign in"} <ArrowRight />
          </button>
          <button
            type="button"
            className="auth-secondary-action"
            onClick={resetPassword}
            disabled={busy}
          >
            Forgot password? Send a setup link
          </button>
        </form>
        <p className="auth-footnote">
          <KeyRound /> Accounts are created or invited by the studio god
          account.
        </p>
      </section>
    </main>
  );
};
