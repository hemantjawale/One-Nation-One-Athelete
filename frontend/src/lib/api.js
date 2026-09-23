export async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    credentials: "include",
    ...options,
    headers: {
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
