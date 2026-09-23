import React, { useState } from "react";
import { Mail, X } from "lucide-react";
import { authorizedFetch } from "../utils/supabase";

export const InviteAdminModal: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await authorizedFetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "Invite failed.");
    setMessage(`Invite sent to ${email}.`);
    setEmail("");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="invite-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close invite dialog"
        >
          <X />
        </button>
        <div className="guide-heading">
          <Mail />
          <div>
            <p className="auth-kicker">GOD ACCESS / ADMIN INVITE</p>
            <h2>Invite an admin</h2>
          </div>
        </div>
        <p className="auth-copy">
          The invitee will receive a Supabase email and join with normal admin
          permissions.
        </p>
        <form onSubmit={invite} className="auth-form">
          <label>
            Admin email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          {message && <p className="auth-message">{message}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Sending invite..." : "Send admin invite"} <Mail />
          </button>
        </form>
      </section>
    </div>
  );
};
