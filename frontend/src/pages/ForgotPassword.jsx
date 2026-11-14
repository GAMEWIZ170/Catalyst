import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AuthLayout } from "./Login";
import { Button, TextField } from "../components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <AuthLayout title="Forgot your password?" subtitle="Enter your email and we will send you a link to choose a new one.">
    {sent
      ? <p className="form-success" role="status">If that email has an account, a reset link is on its way. It works for 30 minutes.</p>
      : <form className="auth-form" onSubmit={submit}>
        <TextField label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" block loading={busy}>Send reset link</Button>
      </form>}
    <p className="auth-switch"><Link to="/login">Back to log in</Link></p>
  </AuthLayout>;
}
