import { lazy, ReactElement, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { PageLoader } from "./components/ui";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AppShell = lazy(() => import("./components/AppShell"));
const Home = lazy(() => import("./pages/app/Home"));
const Invoices = lazy(() => import("./pages/app/Invoices"));
const Customers = lazy(() => import("./pages/app/Customers"));
const Expenses = lazy(() => import("./pages/app/Expenses"));
const Automations = lazy(() => import("./pages/app/Automations"));
const AutomationEditor = lazy(() => import("./pages/app/AutomationEditor"));
const Activity = lazy(() => import("./pages/app/Activity"));
const Settings = lazy(() => import("./pages/app/Settings"));

function RequireAuth({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function GuestOnly({ children }: { children: ReactElement }) {
  const { user } = useAuth();
  return user ? <Navigate to="/app" replace /> : children;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Home />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="customers" element={<Customers />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="automations" element={<Automations />} />
          <Route path="automations/:id" element={<AutomationEditor />} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound inApp />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
