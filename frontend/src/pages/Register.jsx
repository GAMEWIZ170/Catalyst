import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "./Login";
import { Button, TextField } from "../components/ui";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
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

  return <AuthLayout title="Create your account" subtitle="It takes a minute. Then start your first lesson.">
    <form className="auth-form" onSubmit={submit}>
      <TextField label="Full name" type="text" required minLength="2" maxLength="60" autoComplete="name" value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <TextField label="Email" type="email" required autoComplete="email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <TextField label="Password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" hint="At least 8 characters." value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" block loading={busy}>Create account</Button>
    </form>
    <p className="auth-switch">By creating an account you agree to the <Link to="/terms">Terms</Link> and the <Link to="/privacy">Privacy</Link> page.</p>
    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthLayout>;
}
