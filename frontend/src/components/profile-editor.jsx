import React, { useState } from "react";
import { updateProfile } from "../api";
export default function ProfileEditor({ user, token, onSaved }) {
  const [editing, setEditing] = useState(false),
    [form, setForm] = useState({
      displayName: user.displayName,
      bio: user.bio ?? "",
      genres: (user.favoriteGenres ?? []).join(", "),
    }),
    [status, setStatus] = useState(""),
    [saving, setSaving] = useState(false);
  if (!editing)
    return (
      <button className="ghost-button" onClick={() => setEditing(true)}>
        Edit your profile
      </button>
    );
  return (
    <form
      className="stack profile-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setStatus("");
        try {
          const payload = await updateProfile(token, {
            displayName: form.displayName,
            bio: form.bio,
            favoriteGenres: form.genres
              .split(",")
              .map((g) => g.trim())
              .filter(Boolean),
          });
          onSaved(payload.user);
          setEditing(false);
        } catch (error) {
          setStatus(error.message);
        } finally {
          setSaving(false);
        }
      }}
    >
      <label>
        Display name
        <input
          required
          maxLength={100}
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
        />
      </label>
      <label>
        Bio
        <textarea
          maxLength={1000}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
      </label>
      <label>
        Favorite genres
        <span className="muted-text small-text">
          Separate up to 10 genres with commas.
        </span>
        <input
          value={form.genres}
          onChange={(e) => setForm({ ...form, genres: e.target.value })}
        />
      </label>
      <div className="button-row">
        <button className="primary-button" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        <button
          className="ghost-button"
          type="button"
          disabled={saving}
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
      {status && (
        <p role="alert" className="error-text">
          {status}
        </p>
      )}
    </form>
  );
}
