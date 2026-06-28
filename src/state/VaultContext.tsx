import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  isInitialized as vaultIsInitialized,
  initializeVault,
  unlockVault,
  loadAppData,
  saveAppData,
  changePassphrase as vaultChangePassphrase,
  shredAll,
  hasBiometric,
  enableBiometric as vaultEnableBiometric,
  unlockWithBiometric,
  disableBiometric as vaultDisableBiometric,
  WrongPassphraseError,
} from '../db/vault';
import { platformAuthenticatorAvailable } from '../db/webauthn';
import { createDefaultAppData } from '../model/defaults';
import type { AppData } from '../model/types';

/** Where the user is in the app. */
export type AppView = 'loading' | 'landing' | 'auth' | 'app';
/** How the current session persists. */
export type Session = 'guest' | 'account';

/** Auto-lock an account session after this many minutes of inactivity. */
export const DEFAULT_AUTO_LOCK_MINUTES = 5;

interface VaultContextValue {
  view: AppView;
  session: Session | null;
  /** True if a saved (encrypted) vault already exists on this device. */
  initialized: boolean;
  busy: boolean;
  error: string | null;
  data: AppData | null;
  autoLockMinutes: number;
  /** Navigation. */
  goToAuth: () => void;
  backToLanding: () => void;
  startGuest: () => void;
  /** Leave the app back to the landing page, clearing in-memory state. */
  exit: () => void;
  /** Account: create the encrypted vault (seeded from current data if any). */
  initialize: (passphrase: string) => Promise<void>;
  /** Account: unlock an existing encrypted vault. */
  unlock: (passphrase: string) => Promise<void>;
  /** Device supports a platform (Face ID / fingerprint) authenticator. */
  biometricCapable: boolean;
  /** Biometric unlock has been set up for this vault. */
  biometricEnabled: boolean;
  /** Account: unlock via a biometric ceremony (Face ID / fingerprint). */
  unlockBiometric: () => Promise<void>;
  /** Account: set up biometric unlock (requires the current passphrase). */
  enableBiometricUnlock: (passphrase: string) => Promise<void>;
  /** Account: turn off biometric unlock. */
  disableBiometricUnlock: () => Promise<void>;
  /** Apply a mutation to the data; persists only for an account session. */
  update: (mutator: (draft: AppData) => void) => void;
  /** Account: change the passphrase while unlocked. Throws on failure. */
  changePassphrase: (newPassphrase: string) => Promise<void>;
  /** Permanently delete all stored data and return to the landing page. */
  shred: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [autoLockMinutes] = useState(DEFAULT_AUTO_LOCK_MINUTES);
  const [biometricCapable, setBiometricCapable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // The unlocked key lives only in memory (a ref), never in React state/storage.
  const keyRef = useRef<CryptoKey | null>(null);
  // Keep the latest data available to initialize() without stale closures.
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;

  useEffect(() => {
    let active = true;
    vaultIsInitialized().then((init) => {
      if (!active) return;
      setInitialized(init);
      setView('landing');
    });
    void platformAuthenticatorAvailable().then((ok) => active && setBiometricCapable(ok));
    void hasBiometric().then((ok) => active && setBiometricEnabled(ok));
    return () => {
      active = false;
    };
  }, []);

  const exit = useCallback(() => {
    keyRef.current = null;
    setData(null);
    setSession(null);
    setError(null);
    setView('landing');
  }, []);

  const goToAuth = useCallback(() => {
    setError(null);
    setView('auth');
  }, []);

  const backToLanding = useCallback(() => {
    setError(null);
    setView('landing');
  }, []);

  const startGuest = useCallback(() => {
    setData((current) => current ?? createDefaultAppData());
    setSession('guest');
    setError(null);
    setView('app');
  }, []);

  const initialize = useCallback(async (passphrase: string) => {
    setBusy(true);
    setError(null);
    try {
      const key = await initializeVault(passphrase);
      // Seed from any data the user already entered as a guest.
      const seed = dataRef.current ?? createDefaultAppData();
      await saveAppData(key, seed);
      keyRef.current = key;
      setData(seed);
      setInitialized(true);
      setSession('account');
      setView('app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create vault');
    } finally {
      setBusy(false);
    }
  }, []);

  const unlock = useCallback(async (passphrase: string) => {
    setBusy(true);
    setError(null);
    try {
      const key = await unlockVault(passphrase);
      let loaded = await loadAppData(key);
      if (!loaded) {
        loaded = createDefaultAppData();
        await saveAppData(key, loaded);
      }
      keyRef.current = key;
      setData(loaded);
      setSession('account');
      setView('app');
    } catch (e) {
      if (e instanceof WrongPassphraseError) setError('Incorrect passphrase.');
      else setError(e instanceof Error ? e.message : 'Failed to unlock');
    } finally {
      setBusy(false);
    }
  }, []);

  const unlockBiometric = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const key = await unlockWithBiometric();
      let loaded = await loadAppData(key);
      if (!loaded) {
        loaded = createDefaultAppData();
        await saveAppData(key, loaded);
      }
      keyRef.current = key;
      setData(loaded);
      setSession('account');
      setView('app');
    } catch (e) {
      if (e instanceof WrongPassphraseError) setError('Saved credentials are out of date — use your passphrase.');
      else setError('Biometric unlock was cancelled or unavailable.');
    } finally {
      setBusy(false);
    }
  }, []);

  const enableBiometricUnlock = useCallback(async (passphrase: string) => {
    await vaultEnableBiometric(passphrase);
    setBiometricEnabled(true);
  }, []);

  const disableBiometricUnlock = useCallback(async () => {
    await vaultDisableBiometric();
    setBiometricEnabled(false);
  }, []);

  const update = useCallback((mutator: (draft: AppData) => void) => {
    setData((current) => {
      if (!current) return current;
      const draft = structuredClone(current);
      mutator(draft);
      const key = keyRef.current;
      // Persist ONLY for an account session; guest data stays in memory.
      if (key) void saveAppData(key, draft);
      return draft;
    });
  }, []);

  const changePassphrase = useCallback(async (newPassphrase: string) => {
    const key = keyRef.current;
    if (!key) throw new Error('Not unlocked');
    keyRef.current = await vaultChangePassphrase(key, newPassphrase);
  }, []);

  const shred = useCallback(async () => {
    await shredAll();
    keyRef.current = null;
    setData(null);
    setSession(null);
    setInitialized(false);
    setError(null);
    setView('landing');
  }, []);

  // Auto-lock an account session on inactivity (guest has nothing to protect).
  useEffect(() => {
    if (view !== 'app' || session !== 'account') return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(exit, autoLockMinutes * 60_000);
    };
    const events = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll'] as const;
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [view, session, autoLockMinutes, exit]);

  const value: VaultContextValue = {
    view,
    session,
    initialized,
    busy,
    error,
    data,
    autoLockMinutes,
    goToAuth,
    backToLanding,
    startGuest,
    exit,
    initialize,
    unlock,
    biometricCapable,
    biometricEnabled,
    unlockBiometric,
    enableBiometricUnlock,
    disableBiometricUnlock,
    update,
    changePassphrase,
    shred,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within a VaultProvider');
  return ctx;
}
