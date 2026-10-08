const BASE = import.meta.env.VITE_API_BASE || "";

export function getToken() {
  return (
    sessionStorage.getItem("onona-token") ||
    localStorage.getItem("onona-token")
  );
}

export function getAuthenticatedUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  const token = getToken();
  if (!token) return url;

  try {
    const isRelative = url.startsWith("/");
    const targetUrl = isRelative ? window.location.origin + url : url;
    const parsed = new URL(targetUrl);

    if (parsed.pathname.startsWith("/api/") || isRelative) {
      if (!parsed.searchParams.has("token")) {
        parsed.searchParams.set("token", token);
      }
      return isRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
    }
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }

  return url;
}

export async function api(path, options = {}) {
  const token = getToken();
  const response = await fetch(BASE + "/api" + path, {
    credentials: "include",
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });
  const result = await response
    .json()
    .catch(() => ({ error: "Request failed." }));
  if (!response.ok) {
    const e = new Error(result.error || "Request failed.");
    e.status = response.status;
    throw e;
  }
  return result;
}
export const queueKey = (id) => "onona-queue:" + id;
export const pending = (id) =>
  JSON.parse(localStorage.getItem(queueKey(id)) || "[]");
export function enqueue(id, body, key = crypto.randomUUID()) {
  localStorage.setItem(
    queueKey(id),
    JSON.stringify([...pending(id), { key, body }]),
  );
}
let syncing;
export function sync(id) {
  if (syncing) return syncing;
  syncing = (async () => {
    for (const row of pending(id)) {
      await api("/records/sessions", {
        method: "POST",
        body: row.body,
        headers: { "Idempotency-Key": row.key },
      });
      localStorage.setItem(
        queueKey(id),
        JSON.stringify(pending(id).filter((r) => r.key !== row.key)),
      );
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
export async function exportData(name = "athlete-passport.json") {
  const data = await api("/export"),
    url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function uploadCertificateFile(file) {
  const formData = new FormData();
  formData.append("certificate", file);
  return api("/records/certificates/upload", {
    method: "POST",
    body: formData,
  });
}

export async function deleteCertificateFile(publicId) {
  return api(`/records/certificates?publicId=${encodeURIComponent(publicId)}`, {
    method: "DELETE",
  });
}

export async function getPerformanceComparison() {
  return api("/performance/compare");
}

export async function importBenchmarks(records) {
  return api("/benchmarks/import", {
    method: "POST",
    body: records,
  });
}

// Adaptive Training Plan APIs
export async function sendSundayDigestEmail(athleteId, email) {
  return api("/training/send-digest", {
    method: "POST",
    body: { athleteId, email },
  });
}

export async function getTrainingRoadmap() {
  return api("/training/roadmap");
}

export async function getTrainingGoals() {
  return api("/training/goals");
}

export async function updateTrainingGoals(goals) {
  return api("/training/goals", {
    method: "PUT",
    body: goals,
  });
}

export async function getWeeklyPlan(weekStart, source) {
  const params = [];
  if (weekStart) params.push(`weekStart=${encodeURIComponent(weekStart)}`);
  if (source) params.push(`source=${encodeURIComponent(source)}`);
  const q = params.length > 0 ? `?${params.join("&")}` : "";
  return api(`/training/plan${q}`);
}

export async function getWeeklyPlansBoth(weekStart) {
  const q = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  return api(`/training/plan/both${q}`);
}

export async function generateWeeklyPlan(weekStart, force = false) {
  return api("/training/plan/generate", {
    method: "POST",
    body: { weekStart, force },
  });
}

export async function checkInSession(planId, dayIndex, data) {
  return api(`/training/plan/${encodeURIComponent(planId)}/session/${dayIndex}`, {
    method: "PUT",
    body: data,
  });
}

export async function getWeeklyReview(planId) {
  return api(`/training/review/${encodeURIComponent(planId)}`);
}

export async function getRealityCheck() {
  return api("/training/reality-check");
}

export async function getTrainingLibrary() {
  return api("/training/library");
}

// Coach Module APIs
export async function getCoachDashboard() {
  return api("/coach/dashboard");
}

export async function getCoachAthletes(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.sport && params.sport !== "All") query.set("sport", params.sport);
  if (params.status && params.status !== "All") query.set("status", params.status);
  const qStr = query.toString() ? `?${query.toString()}` : "";
  return api(`/coach/athletes${qStr}`);
}

export async function getCoachAthleteDetail(athleteId) {
  return api(`/coach/athletes/${encodeURIComponent(athleteId)}`);
}

export async function getCoachAthletePerformance(athleteId) {
  return api(`/coach/athletes/${encodeURIComponent(athleteId)}/performance`);
}

export async function getCoachAthleteTraining(athleteId) {
  return api(`/coach/athletes/${encodeURIComponent(athleteId)}/training`);
}

export async function getCoachAthleteRecovery(athleteId) {
  return api(`/coach/athletes/${encodeURIComponent(athleteId)}/recovery`);
}

export async function getCoachAthleteGoals(athleteId) {
  return api(`/coach/athletes/${encodeURIComponent(athleteId)}/goals`);
}

export async function updateCoachAthleteGoals(athleteId, goals) {
  return api(`/coach/athletes/${encodeURIComponent(athleteId)}/goals`, {
    method: "PUT",
    body: goals,
  });
}

export async function getCoachAthleteRoadmap(athleteId) {
  return api(`/coach/athletes/${encodeURIComponent(athleteId)}/roadmap`);
}

export async function getCoachTrainingPlans(params = {}) {
  const query = new URLSearchParams();
  if (params.athleteId) query.set("athleteId", params.athleteId);
  if (params.status) query.set("status", params.status);
  const qStr = query.toString() ? `?${query.toString()}` : "";
  return api(`/coach/training-plans${qStr}`);
}

export async function getCoachTrainingPlan(planId) {
  return api(`/coach/training-plans/${encodeURIComponent(planId)}`);
}

export async function createCoachTrainingPlan(plan) {
  return api("/coach/training-plans", {
    method: "POST",
    body: plan,
  });
}

export async function updateCoachTrainingPlan(planId, plan) {
  return api(`/coach/training-plans/${encodeURIComponent(planId)}`, {
    method: "PUT",
    body: plan,
  });
}

export async function publishCoachTrainingPlan(planId) {
  return api(`/coach/training-plans/${encodeURIComponent(planId)}/publish`, {
    method: "POST",
  });
}

export async function rescheduleCoachSession(planId, payload) {
  return api(`/coach/training-plans/${encodeURIComponent(planId)}/reschedule`, {
    method: "POST",
    body: payload,
  });
}

export async function getCoachNotifications() {
  return api("/coach/notifications");
}

export async function getCoachProfile() {
  return api("/coach/profile");
}

export async function updateCoachProfile(profile) {
  return api("/coach/profile", {
    method: "PUT",
    body: profile,
  });
}

export async function getCoachExercises() {
  return api("/coach/exercises");
}

// Backwards compatibility aliases
export async function publishCoachPlan(athleteId, plan) {
  return api(`/coach/athlete/${encodeURIComponent(athleteId)}/plan`, {
    method: "POST",
    body: plan,
  });
}

export async function updateCoachGoals(athleteId, goals) {
  return api(`/coach/athlete/${encodeURIComponent(athleteId)}/goals`, {
    method: "PUT",
    body: goals,
  });
}

export async function submitCoachOverride(athleteId, payload) {
  return api(`/coach/athlete/${encodeURIComponent(athleteId)}/override`, {
    method: "POST",
    body: payload,
  });
}

