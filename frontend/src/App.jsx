import { useEffect, useState, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
  Outlet,
  NavLink,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  Fingerprint,
  ScanLine,
  CalendarDays,
  HeartPulse,
  Compass,
  Wallet,
  GraduationCap,
  ShieldCheck,
  Users,
  Settings,
  Menu,
  LogOut,
  Wifi,
  WifiOff,
  Mic,
  X,
  CheckCircle2,
} from "lucide-react";
import Landing from "./pages/Landing";
import Auth from "./components/Auth";
import { Brand, Modal, Editor } from "./components/UI";
import { api, pending, enqueue, sync, queueKey } from "./lib/api";
const Dashboard = lazy(() => import("./pages/Dashboard")),
  Passport = lazy(() => import("./pages/Passport")),
  Performance = lazy(() => import("./pages/Performance")),
  Training = lazy(() => import("./pages/Training")),
  Recovery = lazy(() => import("./pages/Recovery")),
  Opportunities = lazy(() => import("./pages/Opportunities")),
  Finance = lazy(() => import("./pages/Finance")),
  Profile = lazy(() => import("./pages/Profile")),
  Coach = lazy(() => import("./pages/Coach")),
  Transparency = lazy(() => import("./pages/Transparency")),
  Career = lazy(() => import("./pages/Career")),
  VideoLab = lazy(() => import("./pages/VideoLab"));
const navigation = [
  ["overview", "Overview", LayoutDashboard],
  ["passport", "Athlete passport", Fingerprint],
  ["performance", "Performance", Activity],
  ["video", "Video lab", ScanLine],
  ["training", "Training plan", CalendarDays],
  ["recovery", "Recovery", HeartPulse],
  ["opportunities", "Opportunities", Compass],
  ["finance", "Financial hub", Wallet],
  ["career", "Career pathways", GraduationCap],
  ["coach", "Coach workspace", Users],
  ["transparency", "Transparency", ShieldCheck],
  ["settings", "Profile & privacy", Settings],
];
export default function App() {
  const navigate = useNavigate(),
    [user, setUser] = useState(null),
    [data, setData] = useState(null),
    [boot, setBoot] = useState(true),
    [auth, setAuth] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(null),
    [editor, setEditor] = useState(null),
    [deletion, setDeletion] = useState(null),
    [online, setOnline] = useState(navigator.onLine),
    [queued, setQueued] = useState(0);
  const notify = (message, type = "success") => setToast({ message, type });
  async function reload(u = user) {
    if (!u) return;
    const endpoints = {
      profile: "/profile",
      insights: "/insights",
      sessions: "/records/sessions",
      achievements: "/records/achievements",
      injuries: "/records/injuries",
      expenses: "/records/expenses",
      plans: "/records/plans",
      opportunities: "/opportunities",
      applications: "/applications",
      files: "/files",
      audit: "/audit",
      benchmarks: "/benchmarks",
      fairness: "/fairness",
    };
    if (["coach", "medical"].includes(u.role)) endpoints.coach = "/coach";
    if (["coach", "organiser"].includes(u.role))
      endpoints.applicants = "/applicants";
    const results = await Promise.all(
        Object.values(endpoints).map((path) => api(path)),
      ),
      next = Object.fromEntries(
        Object.keys(endpoints).map((k, i) => [k, results[i]]),
      );
    setData(next);
    localStorage.setItem("onona-cache:" + u.id, JSON.stringify(next));
    setQueued(pending(u.id).length);
    setError("");
  }
  useEffect(() => {
    api("/me")
      .then(async (r) => {
        setUser(r.user);
        sessionStorage.setItem("onona-user", JSON.stringify(r.user));
        await sync(r.user.id);
        await reload(r.user);
      })
      .catch((e) => {
        if (!navigator.onLine) {
          const u = JSON.parse(sessionStorage.getItem("onona-user") || "null");
          if (u) {
            setUser(u);
            setData(
              JSON.parse(localStorage.getItem("onona-cache:" + u.id) || "null"),
            );
            setQueued(pending(u.id).length);
          }
        } else if (e.status !== 401)
          setError(
            "The API is unavailable. Start both packages with npm run dev.",
          );
      })
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const on = async () => {
        setOnline(true);
        if (user)
          try {
            await sync(user.id);
            await reload();
            notify("Connected. Your training records are synced.");
          } catch (e) {
            notify(e.message, "error");
          }
      },
      off = () => setOnline(false);
    addEventListener("online", on);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", on);
      removeEventListener("offline", off);
    };
  }, [user]);
  async function signedIn(u, isNew = false) {
    setUser(u);
    setAuth(null);
    setData(null);
    sessionStorage.setItem("onona-user", JSON.stringify(u));
    await sync(u.id);
    await reload(u);
    navigate(isNew ? "/app/settings" : "/app/overview");
    scrollTo(0, 0);
  }
  async function demo() {
    setBusy(true);
    try {
      await signedIn((await api("/auth/demo", { method: "POST" })).user);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      localStorage.removeItem("onona-cache:" + user.id);
      sessionStorage.removeItem("onona-user");
      setUser(null);
      setData(null);
      navigate("/");
      scrollTo(0, 0);
    } catch (e) {
      notify(e.message, "error");
    }
  }
  async function action(fn, message) {
    setBusy(true);
    try {
      await fn();
      await reload();
      if (message) notify(message);
      return true;
    } catch (e) {
      notify(e.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  const confirmDelete = (fn) => setDeletion(() => fn),
    add = (kind, row) => setEditor({ kind, row }),
    go = (page) => navigate("/app/" + page);
  const remove = (kind, row) =>
    confirmDelete(async () => {
      await api("/records/" + kind + "/" + row.id, { method: "DELETE" });
      await reload();
    });
  async function save(kind, row) {
    const key = crypto.randomUUID();
    if (kind === "sessions" && !row.id && !online) {
      enqueue(user.id, row, key);
      setQueued(pending(user.id).length);
      notify("Saved on this device. Reconnect to sync.");
      return;
    }
    const path =
      kind === "opportunities" ? "/opportunities" : "/records/" + kind;
    try {
      await api(path + (row.id ? "/" + row.id : ""), {
        method: row.id ? "PUT" : "POST",
        body: row,
        headers: { "Idempotency-Key": key },
      });
    } catch (e) {
      if (kind === "sessions" && !row.id && e instanceof TypeError) {
        enqueue(user.id, row, key);
        setQueued(pending(user.id).length);
        notify("Connection interrupted. Session queued safely.");
        return;
      }
      throw e;
    }
    await reload();
    notify("Record saved.");
  }
  const deleteAccount = () =>
    confirmDelete(async () => {
      await api("/account", { method: "DELETE" });
      localStorage.removeItem("onona-cache:" + user.id);
      localStorage.removeItem(queueKey(user.id));
      sessionStorage.removeItem("onona-user");
      setUser(null);
      setData(null);
      navigate("/");
    });
  const context = {
    user,
    data,
    reload,
    action,
    busy,
    notify,
    confirmDelete,
    add,
    remove,
    go,
    queued,
    deleteAccount,
  };
  if (boot)
    return (
      <div className="boot">
        <Brand />
        <span>PREPARING YOUR STARTING LINE…</span>
      </div>
    );
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Landing
              onAuth={setAuth}
              onDemo={user ? () => go("overview") : demo}
              busy={busy}
            />
          }
        />
        <Route
          path="/app"
          element={
            user ? (
              <Workspace
                {...{
                  user,
                  data,
                  online,
                  queued,
                  logout,
                  notify,
                  context,
                  error,
                  reload,
                }}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          {[
            ["overview", Dashboard],
            ["passport", Passport],
            ["performance", Performance],
            ["video", VideoLab],
            ["training", Training],
            ["recovery", Recovery],
            ["opportunities", Opportunities],
            ["finance", Finance],
            ["career", Career],
            ["coach", Coach],
            ["transparency", Transparency],
            ["settings", Profile],
          ].map(([path, Page]) => (
            <Route
              key={path}
              path={path}
              element={
                <Suspense
                  fallback={
                    <div className="empty">Loading your workspace…</div>
                  }
                >
                  <Page />
                </Suspense>
              }
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {auth && (
        <Auth
          mode={auth}
          onMode={setAuth}
          onClose={() => setAuth(null)}
          onSuccess={signedIn}
        />
      )}{" "}
      {editor && (
        <Editor
          {...editor}
          profile={data.profile}
          files={data.files}
          onClose={() => setEditor(null)}
          onSave={(row) => save(editor.kind, row)}
        />
      )}{" "}
      {deletion && (
        <Modal title="Delete permanently?" onClose={() => setDeletion(null)}>
          <p>This removes the selected data and cannot be undone.</p>
          <div className="modal-actions">
            <button className="button ghost" onClick={() => setDeletion(null)}>
              Keep it
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await deletion();
                  setDeletion(null);
                  notify("Deleted successfully.");
                } catch (e) {
                  notify(e.message, "error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete permanently
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className={"toast " + toast.type} role="status">
          {toast.type === "error" ? (
            <X size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && !user && <div className="connection-error">{error}</div>}
    </>
  );
}
function Workspace({
  user,
  data,
  online,
  queued,
  logout,
  notify,
  context,
  error,
  reload,
}) {
  const location = useLocation(),
    navigate = useNavigate(),
    [menu, setMenu] = useState(false),
    name = data?.profile.name || user.name;
  useEffect(() => {
    setMenu(false);
    scrollTo(0, 0);
  }, [location.pathname]);
  function voice() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      notify(
        "Voice navigation is unavailable here. Every control is keyboard accessible.",
        "error",
      );
      return;
    }
    const r = new Recognition();
    r.lang = "en-IN";
    r.onresult = (e) => {
      const words = e.results[0][0].transcript.toLowerCase(),
        page = navigation.find(
          ([id, label]) =>
            words.includes(id) || words.includes(label.toLowerCase()),
        );
      if (page) navigate("/app/" + page[0]);
      else notify("Try “performance”, “training”, or “opportunities”.");
    };
    r.onerror = () =>
      notify("Microphone or speech service unavailable.", "error");
    r.start();
    notify("Listening for a page name…");
  }
  const active =
    navigation.find(([id]) => location.pathname.endsWith("/" + id))?.[1] ||
    "Overview";
  return (
    <div className="workspace">
      <a href="#workspace-main" className="skip">
        Skip to workspace
      </a>
      <aside className={"sidebar " + (menu ? "visible" : "")}>
        <Brand onClick={() => navigate("/")} />
        <div className="workspace-label">
          YOUR ATHLETE WORKSPACE <span>01</span>
        </div>
        <nav>
          {navigation
            .filter(
              ([id]) =>
                id !== "coach" || ["coach", "medical"].includes(user.role),
            )
            .map(([id, label, Icon]) => (
              <NavLink key={id} to={"/app/" + id}>
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="identity-mini">
            <span>
              {name
                .split(" ")
                .map((v) => v[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{name}</strong>
              <small>
                {user.role}
                {user.demo ? " · demo account" : ""}
              </small>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace-body">
        <header className="workspace-top">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span>
              YOUR JOURNEY / <b>{active.toUpperCase()}</b>
            </span>
          </div>
          <div>
            <button
              className="icon-button"
              aria-label="Voice navigation"
              onClick={voice}
            >
              <Mic size={17} />
            </button>
            <span className="connection">
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}{" "}
              {online ? "Connected" : "Offline"}
              {queued ? ` · ${queued} pending` : ""}
            </span>
            <span className="country-label">
              IND <i />
            </span>
          </div>
        </header>
        <main id="workspace-main">
          {!data ? (
            <div className="empty">
              <h2>{error || "Loading your journey…"}</h2>
              {error && (
                <button
                  className="button orange"
                  onClick={() =>
                    reload().catch((e) => notify(e.message, "error"))
                  }
                >
                  Retry
                </button>
              )}
            </div>
          ) : (
            <>
              {user.demo && (
                <div className="demo-banner">
                  <span>
                    <i />
                    DEMO WORKSPACE
                  </span>
                  Sample records and illustrative opportunities. Changes are
                  saved to your own demo account.
                </div>
              )}
              <Outlet context={context} />
            </>
          )}
        </main>
        <footer className="workspace-footer">
          <span>ONE NATION. EVERY ATHLETE.</span>
          <span>YOUR POTENTIAL HAS NO PIN CODE. ↗</span>
        </footer>
      </div>
    </div>
  );
}
