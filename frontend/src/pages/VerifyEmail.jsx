import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "./Login";

// Works whether or not the student is logged in. The link is the proof.
export default function VerifyEmail({ change = false }) {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, markVerified, setEmail } = useAuth();
  const [state, setState] = useState(token ? "working" : "missing");
  const [message, setMessage] = useState("");
  // The link works once. React runs effects twice in development, so both runs share one request.
  const request = useRef(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    request.current = request.current || (change ? api.confirmEmailChange({ token }) : api.verifyEmail({ token }));
    request.current
      .then((res) => { if (live) { setState("done"); if (change && user) setEmail(res.data.email); else markVerified(); } })
      .catch((err) => { if (live) { setState("failed"); setMessage(err.message); } });
    return () => { live = false; };
  }, [token]);

  const home = user ? "/courses" : "/login";
  const homeLabel = user ? "Go to courses" : "Log in";

  if (state === "working") return <AuthLayout title={change ? "Confirming your new email" : "Verifying your email"} subtitle="One moment."><span className="spinner" aria-label="Loading" /></AuthLayout>;
  if (state === "done") return <AuthLayout title={change ? "Email changed" : "Email verified"} subtitle={change ? "Your new email is confirmed. Use it to log in from now on." : "Thank you. Your email is confirmed."}>
    <Link className="button button-primary button-wide" to={home}>{homeLabel}</Link>
  </AuthLayout>;
  return <AuthLayout title="This link did not work" subtitle={state === "missing" ? "The link is incomplete." : message}>
    <p className="auth-switch">{change ? "Ask for a new link in Settings, under Change email." : user ? "Use \"Send the link again\" at the top of any page." : "Log in, then use \"Send the link again\" at the top of the page."}</p>
    <Link className="button button-primary button-wide" to={home}>{homeLabel}</Link>
  </AuthLayout>;
}
