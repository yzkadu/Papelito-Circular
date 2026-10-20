import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useProfile } from '../auth/ProfileContext';
import type { Role, Snapshot } from '../domain/types';
import type { DataRepository } from './repository';

type Status = 'loading' | 'ready' | 'error';

/** Ações do repositório já vinculadas ao perfil atual (o último argumento `role` é preenchido aqui). */
type DropRole<F> = F extends (...args: [...infer A, Role]) => infer R ? (...args: A) => R : never;
type BoundActions = {
  [K in Exclude<keyof DataRepository, 'mode' | 'load' | 'reset'>]: DropRole<DataRepository[K]>;
};

interface DataState {
  status: Status;
  error: string | null;
  snapshot: Snapshot | null;
  mode: DataRepository['mode'];
  reload: () => void;
  reset: () => Promise<void>;
  actions: BoundActions;
}

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ repository, children }: { repository: DataRepository; children: ReactNode }) {
  const { role } = useProfile();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    repository
      .load()
      .then((s) => {
        if (!alive) return;
        setSnapshot(s);
        setStatus('ready');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Falha ao carregar os dados.');
        setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [repository, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  const actions = useMemo<BoundActions>(() => {
    const exec = async (p: Promise<Snapshot>) => {
      const next = await p;
      setSnapshot(next);
      return next;
    };
    const r = repository;
    return {
      saveMaster: (kind, item) => exec(r.saveMaster(kind, item, role)),
      createOrder: (i) => exec(r.createOrder(i, role)),
      addMachineRecord: (i) => exec(r.addMachineRecord(i, role)),
      addManualRecord: (i) => exec(r.addManualRecord(i, role)),
      validateRecord: (k, id) => exec(r.validateRecord(k, id, role)),
      addWasteRecord: (i) => exec(r.addWasteRecord(i, role)),
      addMovement: (i) => exec(r.addMovement(i, role)),
      scheduleCollection: (i) => exec(r.scheduleCollection(i, role)),
      transitionCollection: (id, to, p) => exec(r.transitionCollection(id, to, p, role)),
      addCollectionDocument: (id, d) => exec(r.addCollectionDocument(id, d, role)),
      saveCost: (i) => exec(r.saveCost(i, role)),
      closeCostValidity: (id, to) => exec(r.closeCostValidity(id, to, role)),
    };
  }, [repository, role]);

  const reset = useCallback(async () => {
    setStatus('loading');
    const s = await repository.reset();
    setSnapshot(s);
    setStatus('ready');
  }, [repository]);

  const value = useMemo(
    () => ({ status, error, snapshot, mode: repository.mode, reload, reset, actions }),
    [status, error, snapshot, repository.mode, reload, reset, actions],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData fora do DataProvider');
  return v;
}

/** Para páginas que só renderizam com dados prontos (o AppShell trata loading/erro). */
export function useSnapshot(): Snapshot {
  const { snapshot } = useData();
  if (!snapshot) throw new Error('Snapshot indisponível');
  return snapshot;
}
