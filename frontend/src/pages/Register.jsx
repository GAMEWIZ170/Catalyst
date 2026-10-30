import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "./Login";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
      navigate("/courses", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <AuthLayout title="Start your journey" subtitle="Build knowledge, one lesson at a time.">
    <form className="auth-form" onSubmit={submit}>
      <label>Full name<input type="text" required minLength="2" maxLength="60" autoComplete="name" value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label>Email<input type="email" required autoComplete="email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Password<input type="password" required minLength="8" maxLength="72" autoComplete="new-password" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="button button-primary button-wide" disabled={busy}>{busy ? "Creating account..." : "Create account"}</button>
    </form>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthLayout>;
}
