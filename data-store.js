const STORAGE_KEY = "my-growth-os-state-v2";

export function loadState(defaultState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("my-growth-os-state-v1");
    return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("growth-state-change", { detail: state }));
}

export function subscribeState(callback) {
  const listener = event => callback(event.detail);
  window.addEventListener("growth-state-change", listener);
  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY && event.newValue) callback(JSON.parse(event.newValue));
  });
  return () => window.removeEventListener("growth-state-change", listener);
}
