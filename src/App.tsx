import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { Header } from "./components/Header.tsx";
import { StatusBar, type View } from "./components/StatusBar.tsx";
import { WorktreeList } from "./components/WorktreeList.tsx";
import { CreateWorktree } from "./components/CreateWorktree.tsx";
import { DeleteWorktree } from "./components/DeleteWorktree.tsx";
import { Settings } from "./components/Settings.tsx";
import { PostCreatePrompt } from "./components/PostCreatePrompt.tsx";
import { InitialSetup } from "./components/InitialSetup.tsx";
import { TmuxView, type WorktreeSession } from "./components/TmuxView.tsx";
import { createSessionName } from "./utils/tmux.ts";
import { useWorktrees } from "./hooks/useWorktrees.ts";
import {
  getRepoName,
  getMainRepoRoot,
  isGitRepository,
  removeBranch,
  copyFilesToWorktree,
} from "./utils/git.ts";
import {
  ensureConfigDir,
  loadConfig,
  expandCommand,
  isFirstRun,
} from "./utils/config.ts";
import { executePostCreateCommand } from "./utils/terminal.ts";
import pkg from "../package.json";

const VERSION = pkg.version;
const INSTALL_PATH = import.meta.dir;

export function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [repoName, setRepoName] = useState("...");
  const [isGitRepo, setIsGitRepo] = useState(true);
  const [createdWorktreePath, setCreatedWorktreePath] = useState<string | null>(null);
  const [postCreateCommand, setPostCreateCommand] = useState<string>("");
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [repoRoot, setRepoRoot] = useState<string>("");
  const [tmuxSession, setTmuxSession] = useState<WorktreeSession | null>(null);

  const { worktrees, branches, loading, error, refresh, create, remove, clearError } =
    useWorktrees();

  useEffect(() => {
    const init = async () => {
      const isRepo = await isGitRepository();
      setIsGitRepo(isRepo);
      if (isRepo) {
        const name = await getRepoName();
        const root = await getMainRepoRoot();
        setRepoName(name);
        setRepoRoot(root);
        await ensureConfigDir(root);

        const firstRun = await isFirstRun(root);
        setNeedsSetup(firstRun);

        if (!firstRun) {
          const config = await loadConfig(root);
          setPostCreateCommand(config.postCreateCommand);
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    clearError();
  }, [view, clearError]);

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

      if (input === "s") {
        setView("settings");
        return;
      }

      if (input === "o" && worktrees.length > 0 && worktrees[selectedIndex] && postCreateCommand) {
        handleOpenWorktree(worktrees[selectedIndex].path);
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : worktrees.length - 1));
      }

      if (key.downArrow) {
        setSelectedIndex((i) => (i < worktrees.length - 1 ? i + 1 : 0));
      }
    },
    { isActive: view === "list" && !needsSetup }
  );

  const handleCreate = async (options: {
    path: string;
    branch?: string;
    newBranch?: string;
  }) => {
    try {
      const worktreePath = await create(options);
      const config = await loadConfig(repoRoot);
      setPostCreateCommand(config.postCreateCommand);

      // Copy configured files to the new worktree
      if (config.filesToCopy.length > 0) {
        await copyFilesToWorktree(worktreePath, config.filesToCopy);
      }

      if (config.postCreateCommand) {
        setCreatedWorktreePath(worktreePath);
        setView("postCreate");
      } else {
        setView("list");
      }
    } catch {
      // Error is handled by the hook
    }
  };

  const handlePostCreateSwitch = () => {
    if (createdWorktreePath && postCreateCommand) {
      const command = expandCommand(postCreateCommand, createdWorktreePath);
      executePostCreateCommand(command, createdWorktreePath);
    }
    setCreatedWorktreePath(null);
    setView("list");
  };

  const handlePostCreateStay = () => {
    setCreatedWorktreePath(null);
    setView("list");
  };

  const handlePostCreateTmux = () => {
    if (createdWorktreePath && postCreateCommand) {
      const command = expandCommand(postCreateCommand, createdWorktreePath);
      const sessionName = createSessionName(createdWorktreePath);

      setTmuxSession({
        path: createdWorktreePath,
        command: command,
        sessionName: sessionName,
      });

      setCreatedWorktreePath(null);
      setView("tmux");
    }
  };

  const handleTmuxExit = () => {
    setTmuxSession(null);
    setView("list");
  };

  const handleOpenWorktree = (worktreePath: string) => {
    const command = expandCommand(postCreateCommand, worktreePath);
    executePostCreateCommand(command, worktreePath);
  };

  const handleSettingsClose = async () => {
    const config = await loadConfig(repoRoot);
    setPostCreateCommand(config.postCreateCommand);
    setView("list");
  };

  const handleSetupComplete = async () => {
    const config = await loadConfig(repoRoot);
    setPostCreateCommand(config.postCreateCommand);
    setNeedsSetup(false);
  };

  const handleDelete = async (options: { force: boolean; deleteBranch: boolean }) => {
    const wt = worktrees[selectedIndex];
    if (!wt) return;

    const wasCurrentWorktree = wt.isCurrent;

    try {
      await remove(wt.path, options.force);
      setSelectedIndex((i) => Math.max(0, i - 1));

      // Delete branch if requested
      if (options.deleteBranch && wt.branch) {
        try {
          await removeBranch(wt.branch);
          await refresh();
        } catch {
          // Ignore errors - branch might already be deleted
        }
      }

      // If we deleted the current worktree, exit CLI and show navigation command
      if (wasCurrentWorktree) {
        console.log(`\nWorktree deleted. Run the following command to navigate out:\n`);
        console.log(`  cd ${repoRoot}\n`);
        exit();
        return;
      }

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

  // Show loading state while checking if setup is needed
  if (needsSetup === null) {
    return (
      <Box>
        <Text dimColor>Loading...</Text>
      </Box>
    );
  }

  // Show initial setup if this is the first run
  if (needsSetup) {
    return <InitialSetup repoRoot={repoRoot} onComplete={handleSetupComplete} onExit={exit} />;
  }

  return (
    <Box flexDirection="column">
      <Header repoName={repoName} version={VERSION} installPath={INSTALL_PATH} />

      {view === "list" && (
        <WorktreeList
          worktrees={worktrees}
          selectedIndex={selectedIndex}
          loading={loading}
        />
      )}

      {view === "create" && (
        <CreateWorktree
          repoRoot={repoRoot}
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

      {view === "settings" && <Settings repoRoot={repoRoot} onClose={handleSettingsClose} />}

      {view === "postCreate" && createdWorktreePath && (
        <PostCreatePrompt
          worktreePath={createdWorktreePath}
          command={expandCommand(postCreateCommand, createdWorktreePath)}
          onSwitch={handlePostCreateSwitch}
          onStay={handlePostCreateStay}
          onTmux={handlePostCreateTmux}
        />
      )}

      {view === "tmux" && tmuxSession && (
        <TmuxView initialSession={tmuxSession} onExit={handleTmuxExit} />
      )}

      <StatusBar view={view} error={error} />
    </Box>
  );
}
