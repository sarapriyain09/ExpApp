const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3001";

const TOKEN_KEY = "expapp.token";
const EMAIL_KEY = "expapp.email";

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const getStoredEmail = (): string | null => localStorage.getItem(EMAIL_KEY);

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const storeSession = (token: string, email: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
};

export const isLoggedIn = (): boolean => !!getToken();

export const apiLogin = async (email: string, password: string): Promise<string> => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = (await res.json()) as { token?: string; email?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  storeSession(data.token!, data.email!);
  return data.email!;
};

export const apiRegister = async (email: string, password: string): Promise<string> => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = (await res.json()) as { token?: string; email?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Registration failed");
  storeSession(data.token!, data.email!);
  return data.email!;
};

export const apiGetState = async (): Promise<unknown> => {
  const res = await fetch(`${BASE_URL}/api/state`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load state from server");
  return res.json();
};

export const apiSaveState = async (state: unknown): Promise<void> => {
  await fetch(`${BASE_URL}/api/state`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(state)
  });
};
