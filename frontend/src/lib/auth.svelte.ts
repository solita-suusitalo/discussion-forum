// Reactive auth state for Svelte 5. Initialised to null (SSR-safe).
// Call auth.init() in the root layout's onMount to hydrate from localStorage.

type AuthState = { token: string; userId: number; username: string } | null;

const STORAGE_KEY = "forum_auth";

function decodeToken(token: string): { userId: number; username: string } {
  try {
    const part = token.split(".")[1];
    if (!part) throw new Error("bad token");
    const payload = JSON.parse(atob(part)) as Record<string, unknown>;
    return {
      userId: Number(payload["sub"]),
      username: String(payload["username"]),
    };
  } catch {
    return { userId: 0, username: "" };
  }
}

let _auth = $state<AuthState>(null);

export const auth = {
  get current() {
    return _auth;
  },

  /** Read persisted state from localStorage — call once in root layout onMount */
  init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      _auth = raw ? (JSON.parse(raw) as AuthState) : null;
    } catch {
      _auth = null;
    }
  },

  login(token: string) {
    _auth = { token, ...decodeToken(token) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_auth));
  },

  logout() {
    _auth = null;
    localStorage.removeItem(STORAGE_KEY);
  },
};
