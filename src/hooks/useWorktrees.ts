import { useState, useEffect, useCallback } from "react";
import {
  getWorktrees,
  getBranches,
  createWorktree,
  removeWorktree,
  type Worktree,
  type Branch,
  type CreateWorktreeOptions,
} from "../utils/git.ts";

interface UseWorktreesResult {
  worktrees: Worktree[];
  branches: Branch[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (options: CreateWorktreeOptions) => Promise<string>;
  remove: (path: string, force?: boolean) => Promise<void>;
  clearError: () => void;
}

export function useWorktrees(): UseWorktreesResult {
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wt, br] = await Promise.all([getWorktrees(), getBranches()]);
      setWorktrees(wt);
      setBranches(br);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(
    async (options: CreateWorktreeOptions): Promise<string> => {
      setLoading(true);
      setError(null);
      try {
        const path = await createWorktree(options);
        await refresh();
        return path;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create worktree");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (path: string, force = false) => {
      setLoading(true);
      setError(null);
      try {
        await removeWorktree(path, force);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove worktree");
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { worktrees, branches, loading, error, refresh, create, remove, clearError };
}
