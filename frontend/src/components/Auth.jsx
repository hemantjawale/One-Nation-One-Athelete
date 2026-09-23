import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Modal, Input } from "./UI";
import { field } from "../lib/forms";
import { api } from "../lib/api";
export default function Auth({ mode, onMode, onClose, onSuccess }) {
  const [values, setValues] = useState({
      name: "",
      email: "",
      password: "",
      role: "athlete",
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const fields =
    mode === "login"
      ? [
          field("email", "Email", "email"),
          field("password", "Password", "password"),
        ]
      : [
          field("name", "Full name"),
          field("email", "Email", "email"),
          field("password", "Password · at least 8 characters", "password"),
          field("role", "I am an…", "select", [
            "athlete",
            "coach",
            "organiser",
            "medical",
          ]),
        ];
  return (
    <Modal
      title={mode === "login" ? "Welcome back." : "Your starting line."}
      onClose={onClose}
    >
      <p className="muted">
        One sporting identity. A whole country of possibility.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await api("/auth/" + mode, {
              method: "POST",
              body: values,
            });
            await onSuccess(result.user, mode === "register");
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {fields.map((f) => (
            <Input
              key={f.key}
              f={f}
              value={values[f.key]}
              onChange={(v) => setValues({ ...values, [f.key]: v })}
            />
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button orange full" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
          <ArrowUpRight size={17} />
        </button>
      </form>
      <button
        className="auth-toggle"
        onClick={() => {
          setError("");
          onMode(mode === "login" ? "register" : "login");
        }}
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already registered? Log in"}
      </button>
    </Modal>
  );
}
