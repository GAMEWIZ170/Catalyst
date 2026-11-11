import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { syncThemeColor } from "../utils/themeColor";
import Avatar, { AVATAR_KEYS, AVATAR_LABELS } from "../components/Avatar";

const palettes = [
  { key: "lagoon", name: "Lagoon" },
  { key: "indigo", name: "Indigo" },
  { key: "ember", name: "Ember" },
  { key: "orchid", name: "Orchid" },
  { key: "graphite", name: "Graphite" }
];

function currentPalette() {
  return palettes.some(({ key }) => key === document.documentElement.dataset.palette)
    ? document.documentElement.dataset.palette
    : "lagoon";
}

function applyPalette(palette) {
  document.documentElement.dataset.palette = palette;
  syncThemeColor();
  try {
    window.localStorage.setItem("catalyst-palette", palette);
  } catch {
    // The selection still applies for this session when storage is unavailable.
  }
}

export default function Settings() {
  const { user, updateAvatar } = useAuth();
  const [palette, setPalette] = useState(currentPalette);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [status, setStatus] = useState("");

  function selectPalette(value) {
    setPalette(value);
    applyPalette(value);
  }

  async function selectAvatar(value) {
    setAvatar(value);
    setStatus("");
    try {
      await updateAvatar(value);
      setStatus("Saved");
    } catch (error) {
      setAvatar(user?.avatar || null);
      setStatus(error.message);
    }
  }

  return <div className="content settings-page">
    <div className="section-heading"><h1>Settings</h1></div>
    <section className="settings-section" aria-labelledby="theme-heading">
      <h2 id="theme-heading">Colour theme</h2>
      <div className="settings-radio-grid" role="radiogroup" aria-label="Colour theme">
        {palettes.map((item) => <label className="palette-card" data-palette-preview={item.key} key={item.key}>
          <input type="radio" name="palette" value={item.key} checked={palette === item.key} onChange={() => selectPalette(item.key)} />
          <span className="palette-preview" aria-hidden="true">
            <span className="palette-preview-accent" />
            <span className="palette-preview-paper" />
            <span className="palette-preview-ink">Aa</span>
          </span>
          <span>{item.name}</span>
        </label>)}
      </div>
      <p className="muted settings-help">Use the sun and moon button in the top bar to switch between light and dark.</p>
    </section>
    <section className="settings-section" aria-labelledby="avatar-heading">
      <h2 id="avatar-heading">Profile picture</h2>
      <div className="settings-avatar-grid" role="radiogroup" aria-label="Profile picture">
        {AVATAR_KEYS.map((key) => <label className="avatar-option" key={key}>
          <input type="radio" name="avatar" value={key} checked={avatar === key} onChange={() => selectAvatar(key)} />
          <Avatar avatar={key} size={56} />
          <span>{AVATAR_LABELS[key]}</span>
        </label>)}
        <label className="avatar-option">
          <input type="radio" name="avatar" value="initials" checked={avatar === null} onChange={() => selectAvatar(null)} />
          <Avatar name={user?.name} size={56} />
          <span>Use my initials</span>
        </label>
      </div>
      <p className="settings-status" aria-live="polite">{status}</p>
    </section>
  </div>;
}
