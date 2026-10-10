import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import AuthLayout from "./AuthLayout";
import { Button, Input } from "../components/ui";
import { useAuth } from "../lib/auth";
import { errorMessage } from "../lib/api";
import { useServerConfig } from "../lib/useServerConfig";
import { useDemoLogin } from "../lib/useDemo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/app";
  const { data: config } = useServerConfig();
  const demo = useDemoLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from.startsWith("/app") ? from : "/app", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Couldn't log you in. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to see what your automations have been up to.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!email || !password}>
          Log in
        </Button>
      </form>

      {config?.demoEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-dim">
            <span className="h-px flex-1 bg-white/10" />
            or
            <span className="h-px flex-1 bg-white/10" />
          </div>
          <Button variant="outline" size="lg" className="w-full" onClick={demo.start} loading={demo.loading} icon={<Play className="h-4 w-4 fill-current" />}>
            Try the demo account
          </Button>
        </>
      )}

      <p className="mt-8 text-center text-sm text-mute">
        New to AutoFlow?{" "}
        <Link to="/signup" className="font-semibold text-pink hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
