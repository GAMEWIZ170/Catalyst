import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/layout/ThemeToggle";
import { Button, Illustration, TextField } from "../../components/ui";

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
      navigate(location.state?.from || "/home", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <AuthLayout title="Log in" subtitle="Pick up where you left off">
    <form className="grid gap-4" onSubmit={submit}>
      <TextField label="Email" type="email" required autoComplete="email" value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <TextField label="Password" type="password" required autoComplete="current-password" value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })} />
      {error && <p className="m-0 text-destructive" role="alert">{error}</p>}
      <Button type="submit" block loading={busy}>Log in</Button>
    </form>
    <p className="m-0 text-sm text-muted-foreground [&_a]:font-semibold [&_a]:text-brand-ink [&_a]:underline">New to Catalyst? <Link to="/register">Create an account</Link></p>
  </AuthLayout>;
}

export function AuthLayout({ title, subtitle, children }) {
  return <div className="relative grid min-h-dvh content-center justify-items-center gap-4 px-4 py-12">
    <div className="absolute top-3 right-3"><ThemeToggle /></div>
    <div className="flex items-center gap-2 text-xl font-bold"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">C</span><span>Catalyst</span></div>
    <p className="m-0 text-muted-foreground">Structured revision for students</p>
    <div className="grid w-full max-w-3xl items-center gap-8 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:justify-center">
      <section className="grid gap-4 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-1"><h1 className="m-0 text-3xl leading-tight font-bold">{title}</h1><p className="m-0 text-muted-foreground">{subtitle}</p></div>
        {children}
      </section>
      <Illustration name="study" className="hidden w-full max-w-xs justify-self-center text-foreground md:block" />
    </div>
  </div>;
}
