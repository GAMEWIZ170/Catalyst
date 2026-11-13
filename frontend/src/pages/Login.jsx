import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { Button, TextField } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
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
      await login(form);
      navigate(location.state?.from || "/courses", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <AuthLayout title="Welcome back" subtitle="Log in to pick up where you left off.">
    <form className="auth-form" onSubmit={submit}>
      <TextField label="Email" type="email" required autoComplete="email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <TextField label="Password" type="password" required autoComplete="current-password" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button type="submit" block loading={busy}>Log in</Button>
    </form>
    <p className="auth-switch">New to Catalyst? <Link to="/register">Create an account</Link></p>
  </AuthLayout>;
}

export function AuthLayout({ title, subtitle, children }) {
  return <div className="auth-page">
    <ThemeToggle />
    <div className="auth-brand"><span className="brand-mark">C</span><span>Catalyst</span></div>
    <p className="auth-value">Structured revision for UG students</p>
    <section className="auth-card">
      <h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}
    </section>
  </div>;
}
