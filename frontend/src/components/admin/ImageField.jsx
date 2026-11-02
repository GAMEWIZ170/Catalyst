import { useRef, useState } from "react";
import { api } from "../../api/client";
import { imageUrl } from "../../utils/cloudinary";

export default function ImageField({ label, value, onChange, maxBytes = 2 * 1024 * 1024, compact = false }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [description, setDescription] = useState(value?.alt || "");
  const [uploading, setUploading] = useState(false);

  async function upload(file) {
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPEG, PNG or WEBP image.");
      return;
    }
    if (file.size > maxBytes) {
      setError("Image must be 2 MB or smaller.");
      return;
    }
    setUploading(true);
    setStatus("Uploading...");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await api.uploadImage(body);
      onChange({ ...(response.data || response), alt: description });
      setStatus("Uploaded");
    } catch (uploadError) {
      setError(uploadError.message);
      setStatus("");
    } finally {
      setUploading(false);
    }
  }

  function updateDescription(next) {
    setDescription(next);
    if (value) onChange({ ...value, alt: next });
  }

  return <fieldset className={`image-field ${compact ? "image-field--compact" : ""}`}>
    <legend>{label}</legend>
    {value?.url && <img className="image-field-preview" src={imageUrl(value.url, 400)} alt={value.alt || ""} />}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => event.target.files[0] && upload(event.target.files[0])} />
    <button className="button button-secondary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>{value ? "Replace" : "Choose image"}</button>
    {value && <button className="button button-secondary" type="button" disabled={uploading} onClick={() => onChange(null)}>Remove</button>}
    {value && <label className="admin-field">Image description<input required maxLength="200" value={description} onChange={(event) => updateDescription(event.target.value)} /><span className="muted">Describe the image for people who cannot see it</span></label>}
    <StatusMessage message={status || error} error={Boolean(error)} />
  </fieldset>;
}
