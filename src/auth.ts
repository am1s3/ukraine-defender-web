// ============================================================
// Ukraine Defender — auth.ts
// FULL FILE
//
// Auth state manager:
// - token storage;
// - login / register / logout;
// - restore session;
// - profile updates;
// - password recovery;
// - role helpers;
// - auth events for UI.
// ============================================================

import {
  loginUser,
  registerUser,
  logoutUser,
  fetchMe,
  updateProfile as apiUpdateProfile,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
  getToken,
  setToken,
  clearToken,
  isAdminRole,
  isStaffRole,
  isOwnerRole
} from "./api";

import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  ProfilePatch,
  PasswordForgotPayload,
  PasswordForgotResponse,
  PasswordResetPayload,
  UserRole
} from "./types";

// ============================================================
// EVENTS
// ============================================================

export const AUTH_CHANGED_EVENT = "ud:auth:changed";
export const AUTH_LOGIN_EVENT = "ud:auth:login";
export const AUTH_LOGOUT_EVENT = "ud:auth:logout";

export interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  pending: boolean;
}

export interface AuthChangedDetail {
  user: AuthUser | null;
  authenticated: boolean;
  initialized: boolean;
  pending: boolean;
}

export interface AuthLoginDetail {
  user: AuthUser;
}

export interface AuthLogoutDetail {
  reason: "manual" | "unauthorized" | "expired" | "unknown";
}

// ============================================================
// STATE
// ============================================================

const TOKEN_STORAGE_KEY = "ud_token";

let state: AuthState = {
  user: null,
  initialized: false,
  pending: false
};

let restorePromise: Promise<AuthUser | null> | null = null;

let unauthorizedListenerAttached = false;
let storageListenerAttached = false;

// ============================================================
// HELPERS
// ============================================================

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined"
  );
}

function cloneUser(
  user: AuthUser | null
): AuthUser | null {
  if (!user) return null;

  return { ...user };
}

function emitAuthChanged(): void {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent<AuthChangedDetail>(AUTH_CHANGED_EVENT, {
      detail: {
        user: cloneUser(state.user),
        authenticated: !!state.user,
        initialized: state.initialized,
        pending: state.pending
      }
    })
  );
}

function emitLogin(user: AuthUser): void {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent<AuthLoginDetail>(AUTH_LOGIN_EVENT, {
      detail: {
        user: cloneUser(user) as AuthUser
      }
    })
  );
}

function emitLogout(reason: AuthLogoutDetail["reason"]): void {
  if (!isBrowser()) return;

  window.dispatchEvent(
    new CustomEvent<AuthLogoutDetail>(AUTH_LOGOUT_EVENT, {
      detail: {
        reason
      }
    })
  );
}

// ============================================================
// STATE GETTERS
// ============================================================

export function getAuthState(): AuthState {
  return {
    user: cloneUser(state.user),
    initialized: state.initialized,
    pending: state.pending
  };
}

export function getCurrentUser(): AuthUser | null {
  return cloneUser(state.user);
}

export function isAuthenticated(): boolean {
  return !!state.user;
}

export function isAuthInitialized(): boolean {
  return state.initialized;
}

export function isAuthPending(): boolean {
  return state.pending;
}

export function getUserId(): number | null {
  return state.user?.id ?? null;
}

export function getUserRole(): UserRole | null {
  return state.user?.role ?? null;
}

export function isCurrentUserAdmin(): boolean {
  return isAdminRole(state.user?.role);
}

export function isCurrentUserStaff(): boolean {
  return isStaffRole(state.user?.role);
}

export function isCurrentUserOwner(): boolean {
  return isOwnerRole(state.user?.role);
}

export function canAccessAdminPanel(): boolean {
  return isAdminRole(state.user?.role);
}

export function canUseSupportAsStaff(): boolean {
  return isStaffRole(state.user?.role);
}

// ============================================================
// SESSION
// ============================================================

function setSession(
  token: string,
  user: AuthUser,
  emitLoginEvent: boolean = true
): void {
  setToken(token);

  state.user = { ...user };

  emitAuthChanged();

  if (emitLoginEvent) {
    emitLogin(state.user);
  }
}

function clearSession(
  emitLogoutEvent: boolean = true,
  reason: AuthLogoutDetail["reason"] = "manual"
): void {
  clearToken();

  const hadUser = !!state.user;

  state.user = null;

  emitAuthChanged();

  if (emitLogoutEvent && hadUser) {
    emitLogout(reason);
  }
}

// ============================================================
// RESTORE SESSION
// ============================================================

export async function restoreSession(): Promise<AuthUser | null> {
  if (state.initialized && state.user) {
    return cloneUser(state.user);
  }

  const token = getToken();

  if (!token) {
    state.initialized = true;
    state.pending = false;
    state.user = null;

    emitAuthChanged();

    return null;
  }

  if (restorePromise) {
    return restorePromise;
  }

  restorePromise = (async () => {
    state.pending = true;

    emitAuthChanged();

    try {
      const data = await fetchMe();

      state.user = data.user;
      state.initialized = true;

      emitAuthChanged();

      return cloneUser(state.user);
    } catch {
      clearSession(false);

      state.initialized = true;

      emitAuthChanged();

      return null;
    } finally {
      state.pending = false;
      restorePromise = null;

      emitAuthChanged();
    }
  })();

  return restorePromise;
}

// ============================================================
// AUTH ACTIONS
// ============================================================

export async function login(
  payload: LoginPayload
): Promise<AuthUser> {
  const data = await loginUser(payload);

  setSession(data.token, data.user);

  return cloneUser(data.user) as AuthUser;
}

export async function register(
  payload: RegisterPayload
): Promise<AuthUser> {
  const data = await registerUser(payload);

  setSession(data.token, data.user);

  return cloneUser(data.user) as AuthUser;
}

export async function logout(): Promise<void> {
  try {
    await logoutUser();
  } catch {
    // logout API error is not critical
  }

  clearSession(true, "manual");
}

export async function refreshMe(): Promise<AuthUser | null> {
  try {
    const data = await fetchMe();

    state.user = data.user;
    state.initialized = true;

    emitAuthChanged();

    return cloneUser(state.user);
  } catch {
    clearSession(false);

    state.initialized = true;

    emitAuthChanged();

    return null;
  }
}

export async function updateProfile(
  patch: ProfilePatch
): Promise<AuthUser> {
  const data = await apiUpdateProfile(patch);

  state.user = data.user;

  emitAuthChanged();

  return cloneUser(data.user) as AuthUser;
}

// ============================================================
// PASSWORD RECOVERY
// ============================================================

export async function requestPasswordReset(
  payload: PasswordForgotPayload
): Promise<PasswordForgotResponse> {
  return apiForgotPassword(payload);
}

export async function confirmPasswordReset(
  payload: PasswordResetPayload
): Promise<void> {
  await apiResetPassword(payload);

  clearSession(false, "expired");
}

// ============================================================
// EVENTS / SUBSCRIPTIONS
// ============================================================

export function onAuthChanged(
  handler: (detail: AuthChangedDetail) => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<AuthChangedDetail>;

    if (custom.detail) {
      handler(custom.detail);
    }
  };

  window.addEventListener(AUTH_CHANGED_EVENT, listener);

  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, listener);
  };
}

export function onAuthLogin(
  handler: (detail: AuthLoginDetail) => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<AuthLoginDetail>;

    if (custom.detail) {
      handler(custom.detail);
    }
  };

  window.addEventListener(AUTH_LOGIN_EVENT, listener);

  return () => {
    window.removeEventListener(AUTH_LOGIN_EVENT, listener);
  };
}

export function onAuthLogout(
  handler: (detail: AuthLogoutDetail) => void
): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  const listener = (event: Event) => {
    const custom = event as CustomEvent<AuthLogoutDetail>;

    if (custom.detail) {
      handler(custom.detail);
    }
  };

  window.addEventListener(AUTH_LOGOUT_EVENT, listener);

  return () => {
    window.removeEventListener(AUTH_LOGOUT_EVENT, listener);
  };
}

// ============================================================
// GLOBAL 401 HANDLING
// ============================================================

function handleUnauthorized(): void {
  if (!getToken()) {
    return;
  }

  clearSession(true, "unauthorized");
}

function attachUnauthorizedListener(): void {
  if (!isBrowser() || unauthorizedListenerAttached) {
    return;
  }

  window.addEventListener("ud:unauthorized", handleUnauthorized);

  unauthorizedListenerAttached = true;
}

function detachUnauthorizedListener(): void {
  if (!isBrowser() || !unauthorizedListenerAttached) {
    return;
  }

  window.removeEventListener("ud:unauthorized", handleUnauthorized);

  unauthorizedListenerAttached = false;
}

// ============================================================
// STORAGE SYNC
// ============================================================

function handleStorageChange(event: StorageEvent): void {
  if (event.key !== TOKEN_STORAGE_KEY) {
    return;
  }

  if (!event.newValue) {
    clearSession(true, "manual");
    return;
  }

  void restoreSession();
}

function attachStorageListener(): void {
  if (!isBrowser() || storageListenerAttached) {
    return;
  }

  window.addEventListener("storage", handleStorageChange);

  storageListenerAttached = true;
}

function detachStorageListener(): void {
  if (!isBrowser() || !storageListenerAttached) {
    return;
  }

  window.removeEventListener("storage", handleStorageChange);

  storageListenerAttached = false;
}

// ============================================================
// INIT / DESTROY
// ============================================================

export interface InitAuthOptions {
  restore?: boolean;
  attachGlobalListeners?: boolean;
}

export async function initAuth(
  options: InitAuthOptions = {}
): Promise<AuthUser | null> {
  if (options.attachGlobalListeners !== false) {
    attachUnauthorizedListener();
    attachStorageListener();
  }

  if (options.restore === false) {
    state.initialized = true;

    emitAuthChanged();

    return cloneUser(state.user);
  }

  return restoreSession();
}

export function destroyAuth(): void {
  detachUnauthorizedListener();
  detachStorageListener();

  state = {
    user: null,
    initialized: false,
    pending: false
  };

  restorePromise = null;
}
