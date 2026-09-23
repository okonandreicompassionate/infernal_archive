import React from "react";
import { BookOpen, X } from "lucide-react";

export const GuideModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <section
      className="guide-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="modal-close"
        onClick={onClose}
        aria-label="Close guide"
      >
        <X />
      </button>
      <div className="guide-heading">
        <BookOpen />
        <div>
          <p className="auth-kicker">FIELD GUIDE / 01</p>
          <h2>Navigate the archive</h2>
        </div>
      </div>
      <div className="guide-grid">
        <article>
          <span>01</span>
          <h3>Start at Dashboard</h3>
          <p>
            Review canon health, recent edits, pending retcons, and production
            tasks.
          </p>
        </article>
        <article>
          <span>02</span>
          <h3>Build the world</h3>
          <p>
            Use the archive tabs for characters, teams, locations, powers,
            artifacts, events, and issues.
          </p>
        </article>
        <article>
          <span>03</span>
          <h3>Trace continuity</h3>
          <p>
            Use Knowledge Graph for relationships and Timeline for chronological
            order.
          </p>
        </article>
        <article>
          <span>04</span>
          <h3>Make the issue</h3>
          <p>
            Writer Studio manages script pages. Artist Studio stores visual
            development and references.
          </p>
        </article>
        <article>
          <span>05</span>
          <h3>Ask the Lorekeeper</h3>
          <p>
            Use the AI assistant for canon-aware questions and suggestions
            grounded in the archive.
          </p>
        </article>
        <article>
          <span>06</span>
          <h3>Manage access</h3>
          <p>
            Admins can edit canon. Only the god account can invite another
            admin.
          </p>
        </article>
      </div>
    </section>
  </div>
);
