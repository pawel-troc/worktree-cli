import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Header } from "./components/Header.tsx";
import { StatusBar, type View } from "./components/StatusBar.tsx";
import { WorktreeList } from "./components/WorktreeList.tsx";
import { CreateWorktree } from "./components/CreateWorktree.tsx";
import { DeleteWorktree } from "./components/DeleteWorktree.tsx";
import { useWorktrees } from "./hooks/useWorktrees.ts";
import { getRepoName, isGitRepository } from "./utils/git.ts";
import { ensureConfigDir } from "./utils/config.ts";

export function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [repoName, setRepoName] = useState("...");
  const [isGitRepo, setIsGitRepo] = useState(true);

  const { worktrees, branches, loading, error, refresh, create, remove } =
    useWorktrees();

  useEffect(() => {
    const init = async () => {
      const isRepo = await isGitRepository();
      setIsGitRepo(isRepo);
      if (isRepo) {
        const name = await getRepoName();
        setRepoName(name);
        await ensureConfigDir();
      }
    };
    init();
  }, []);

  useInput(
    (input, key) => {
      if (view !== "list") return;

      if (input === "q") {
        exit();
        return;
      }

      if (input === "c") {
        setView("create");
        return;
      }

      if (input === "d" && worktrees.length > 0 && worktrees[selectedIndex]) {
        setView("delete");
        return;
      }

      if (input === "r") {
        refresh();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : worktrees.length - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((i) => (i < worktrees.length - 1 ? i + 1 : 0));
      }
    },
    { isActive: view === "list" }
  );

  const handleCreate = async (options: {
    path: string;
    branch?: string;
    newBranch?: string;
    commit?: string;
  }) => {
    try {
      await create(options);
      setView("list");
    } catch {
      // Error is handled by the hook
    }
  };

  const handleDelete = async (force: boolean) => {
    const wt = worktrees[selectedIndex];
    if (!wt) return;
    try {
      await remove(wt.path, force);
      setSelectedIndex((i) => Math.max(0, i - 1));
      setView("list");
    } catch {
      // Error is handled by the hook
    }
  };

  if (!isGitRepo) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: Not a git repository</Text>
        <Text dimColor>
          Please run this command from within a git repository.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Header repoName={repoName} />

      {view === "list" && (
        <WorktreeList
          worktrees={worktrees}
          selectedIndex={selectedIndex}
          loading={loading}
        />
      )}

      {view === "create" && (
        <CreateWorktree
          branches={branches}
          onSubmit={handleCreate}
          onCancel={() => setView("list")}
        />
      )}

      {view === "delete" && worktrees[selectedIndex] && (
        <DeleteWorktree
          worktree={worktrees[selectedIndex]}
          onConfirm={handleDelete}
          onCancel={() => setView("list")}
        />
      )}

      <StatusBar view={view} error={error} />
    </Box>
  );
}
