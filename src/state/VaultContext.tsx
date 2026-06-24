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
  WrongPassphraseError,
} from '../db/vault';
import { createDefaultAppData } from '../model/defaults';
import type { AppData } from '../model/types';

export type VaultStatus = 'loading' | 'locked' | 'unlocked';

/** Auto-lock after this many minutes of inactivity. */
export const DEFAULT_AUTO_LOCK_MINUTES = 5;

interface VaultContextValue {
  status: VaultStatus;
  initialized: boolean;
  busy: boolean;
  error: string | null;
  data: AppData | null;
  autoLockMinutes: number;
  setAutoLockMinutes: (n: number) => void;
  initialize: (passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  /** Apply a mutation to a draft copy of the data and persist it (encrypted). */
  update: (mutator: (draft: AppData) => void) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [initialized, setInitialized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState(DEFAULT_AUTO_LOCK_MINUTES);

  // The unlocked key lives only in memory (a ref), never in React state/storage.
  const keyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    let active = true;
    vaultIsInitialized().then((init) => {
      if (!active) return;
      setInitialized(init);
      setStatus('locked');
    });
    return () => {
      active = false;
    };
  }, []);

  const lock = useCallback(() => {
    keyRef.current = null;
    setData(null);
    setError(null);
    setStatus('locked');
  }, []);

  const initialize = useCallback(async (passphrase: string) => {
    setBusy(true);
    setError(null);
    try {
      const key = await initializeVault(passphrase);
      const fresh = createDefaultAppData();
      await saveAppData(key, fresh);
      keyRef.current = key;
      setData(fresh);
      setInitialized(true);
      setStatus('unlocked');
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
      setStatus('unlocked');
    } catch (e) {
      if (e instanceof WrongPassphraseError) setError('Incorrect passphrase.');
      else setError(e instanceof Error ? e.message : 'Failed to unlock');
    } finally {
      setBusy(false);
    }
  }, []);

  const update = useCallback((mutator: (draft: AppData) => void) => {
    setData((current) => {
      if (!current) return current;
      const draft = structuredClone(current);
      mutator(draft);
      const key = keyRef.current;
      if (key) void saveAppData(key, draft); // persist (encrypted) in the background
      return draft;
    });
  }, []);

  // Auto-lock on inactivity.
  useEffect(() => {
    if (status !== 'unlocked') return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, autoLockMinutes * 60_000);
    };
    const events = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll'] as const;
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [status, autoLockMinutes, lock]);

  const value: VaultContextValue = {
    status,
    initialized,
    busy,
    error,
    data,
    autoLockMinutes,
    setAutoLockMinutes,
    initialize,
    unlock,
    lock,
    update,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within a VaultProvider');
  return ctx;
}
