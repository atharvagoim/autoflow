import { ChangeEvent, FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "./AuthLayout";
import { Button, Input } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/api";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const shortPassword = form.password.length > 0 && form.password.length < 8;
  const badEmail = touched && form.email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (!form.name.trim() || badEmail || form.password.length < 8) return;
    setLoading(true);
    try {
      await signup(form.name.trim(), form.email.trim(), form.password);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Couldn't create your account. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthLayout title="Create your account" subtitle="Free to start. You'll be in your workspace in a few seconds.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Your name" autoComplete="name" value={form.name} onChange={set("name")} error={touched && !form.name.trim() ? "Enter your name" : undefined} />
        <Input label="Email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={set("email")} onBlur={() => setTouched(true)} error={badEmail ? "Enter a valid email address" : undefined} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={touched && form.password.length < 8 ? "Use at least 8 characters" : undefined}
          help={!touched || !shortPassword ? "At least 8 characters" : undefined}
        />
        {error && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-mute">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-pink hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
