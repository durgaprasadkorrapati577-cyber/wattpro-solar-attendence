"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";

export default function LoginForm({ needsSetup }: { needsSetup: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(needsSetup ? "/api/auth/bootstrap" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(needsSetup ? { name, email, password } : { email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (needsSetup ? "Unable to complete setup." : "Unable to sign in."));
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <form className="login-form" onSubmit={submit}>
        {needsSetup && (
          <div className="field-group">
            <label htmlFor="setup-name">Full name</label>
            <div className="input-with-icon">
              <UserRound size={18} />
              <input id="setup-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Anil Kumar" autoComplete="name" required />
            </div>
          </div>
        )}
        <div className="field-group">
          <label htmlFor="login-email">Work email</label>
          <div className="input-with-icon">
            <Mail size={18} />
            <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@wattprosolar.in" autoComplete="email" required />
          </div>
        </div>
        <div className="field-group">
          <label htmlFor="login-password">Password</label>
          <div className="input-with-icon">
            <LockKeyhole size={18} />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={needsSetup ? "At least 8 characters" : "Enter your password"}
              autoComplete={needsSetup ? "new-password" : "current-password"}
              minLength={needsSetup ? 8 : undefined}
              required
            />
            <button className="input-visibility" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {needsSetup && <span className="field-hint">Use a password of at least 8 characters. You can change it later in settings.</span>}
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? <LoaderCircle size={18} className="spin" /> : <>{needsSetup ? "Create admin account" : "Sign in to workspace"} <ArrowRight size={18} /></>}
        </button>
      </form>
      {needsSetup && (
        <div className="setup-note">
          <span className="setup-note-icon"><ShieldCheck size={17} /></span>
          <div>
            <strong>You’re the first person here</strong>
            <p>This account will be the workspace administrator. You can add your team and work sites right after signing in.</p>
          </div>
        </div>
      )}
    </>
  );
}
