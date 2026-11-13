import { useEffect, useRef, useState } from "react";
import { Button, TextField } from "../ui";
import { api } from "../../api/client";
import { imageUrl } from "../../utils/cloudinary";
import StatusMessage from "./StatusMessage";

export default function ImageField({ label, value, onChange, onValidityChange, maxBytes = 2 * 1024 * 1024, compact = false }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [description, setDescription] = useState(value?.alt || "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDescription(value?.alt || "");
  }, [value?.alt]);

  function notify(next) {
    onChange(next);
    onValidityChange?.(!next || Boolean(next.alt?.trim()));
  }

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
      notify({ ...(response.data || response), alt: description });
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
    if (value) notify({ ...value, alt: next });
  }

  return <fieldset className={`image-field ${compact ? "image-field--compact" : ""}`}>
    <legend>{label}</legend>
    {value?.url && <img className="image-field-preview" src={imageUrl(value.url, 400)} alt={value.alt || ""} />}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => event.target.files[0] && upload(event.target.files[0])} />
    <Button variant="secondary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>{value ? "Replace" : "Choose image"}</Button>
    {value && <Button variant="secondary" type="button" disabled={uploading} onClick={() => notify(null)}>Remove</Button>}
    {value && <TextField label="Image description" required maxLength="200" value={description} onChange={(event) => updateDescription(event.target.value)} hint="Describe the image for people who cannot see it" />}
    <StatusMessage message={status || error} error={Boolean(error)} />
  </fieldset>;
}
