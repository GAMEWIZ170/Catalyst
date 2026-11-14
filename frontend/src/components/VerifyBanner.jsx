import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

// Shown to students who have not verified their email yet. It only warns: nothing is blocked.
export default function VerifyBanner() {
  const { user } = useAuth();
  const [state, setState] = useState({ busy: false, message: "", failed: false });
  if (!user || user.role !== "student" || user.emailVerified !== false) return null;

  async function resend() {
    setState({ busy: true, message: "", failed: false });
    try {
      const { message } = await api.resendVerification();
      setState({ busy: false, message, failed: false });
    } catch (err) {
      setState({ busy: false, message: err.message, failed: true });
    }
  }

  return <div className="verify-banner" role="status">
    <span>Please verify your email ({user.email}). Check your inbox for the link.</span>
    <button className="verify-banner-action" type="button" onClick={resend} disabled={state.busy}>
      {state.busy ? "Sending..." : "Send the link again"}
    </button>
    {state.message && <span className={state.failed ? "verify-banner-note verify-banner-note--error" : "verify-banner-note"}>{state.message}</span>}
  </div>;
}
