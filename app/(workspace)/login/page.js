"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { apiConfigured } from "@/lib/api";

export default function Login() {
  const { login, register, user } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wsName, setWsName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!apiConfigured) {
    return (
      <div className="mx-auto max-w-md rounded border border-line bg-white p-8 text-center">
        <h1 className="font-serif text-2xl font-semibold">Login not available</h1>
        <p className="mt-3 text-mute">The backend API address is not configured. Set <code>NEXT_PUBLIC_API_URL</code> in your <code>.env</code> file and restart the dev server.</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="mx-auto max-w-md rounded border border-line bg-white p-8 text-center">
        <h1 className="font-serif text-2xl font-semibold">Signed in</h1>
        <p className="mt-3 text-mute">You are logged in as <strong>{user.email}</strong> ({user.role}).</p>
        <button className="btn btn-primary mt-4" onClick={() => router.push("/queue")}>Go to review queue</button>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await register(wsName, email, password);
      } else {
        await login(email, password);
      }
      router.push("/queue");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-3xl font-semibold text-center">{mode === "login" ? "Sign in" : "Create workspace"}</h1>
      <p className="mt-2 text-center text-mute">{mode === "login" ? "Sign in to your workspace." : "Set up a new workspace and admin account."}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded border border-line bg-white p-6">
        {mode === "register" && (
          <label className="block text-sm font-medium">Workspace name
            <input required value={wsName} onChange={(e) => setWsName(e.target.value)}
              className="mt-1 w-full rounded border border-line p-2 font-normal" placeholder="My company" />
          </label>
        )}
        <label className="block text-sm font-medium">Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-line p-2 font-normal" placeholder="you@example.com" />
        </label>
        <label className="block text-sm font-medium">Password
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            minLength={10} className="mt-1 w-full rounded border border-line p-2 font-normal" placeholder={mode === "register" ? "At least 10 characters" : ""} />
        </label>
        {error && <p className="text-sm text-fail" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{busy ? "Please wait" : mode === "login" ? "Sign in" : "Create workspace"}</button>
      </form>

      <p className="mt-4 text-center text-sm text-mute">
        {mode === "login" ? (
          <>No workspace yet? <button className="underline" onClick={() => { setMode("register"); setError(""); }}>Create one</button></>
        ) : (
          <>Already have an account? <button className="underline" onClick={() => { setMode("login"); setError(""); }}>Sign in</button></>
        )}
      </p>
    </div>
  );
}

