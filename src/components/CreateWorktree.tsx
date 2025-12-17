import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import type { Branch } from "../utils/git.ts";
import { getWorktreePath } from "../utils/config.ts";

type CreateMode = "existing" | "new" | "commit";

interface CreateWorktreeProps {
  branches: Branch[];
  onSubmit: (options: {
    path: string;
    branch?: string;
    newBranch?: string;
    commit?: string;
  }) => void;
  onCancel: () => void;
}

export function CreateWorktree({
  branches,
  onSubmit,
  onCancel,
}: CreateWorktreeProps) {
  const [mode, setMode] = useState<CreateMode>("existing");
  const [step, setStep] = useState<"mode" | "input" | "path">("mode");
  const [branchIndex, setBranchIndex] = useState(0);
  const [newBranchName, setNewBranchName] = useState("");
  const [commitRef, setCommitRef] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [suggestedPath, setSuggestedPath] = useState("");
  const [useCustomPath, setUseCustomPath] = useState(false);

  const localBranches = branches.filter((b) => !b.isRemote);
  const modeOptions: { mode: CreateMode; label: string }[] = [
    { mode: "existing", label: "From existing branch" },
    { mode: "new", label: "Create new branch" },
    { mode: "commit", label: "From commit/tag (detached)" },
  ];

  useEffect(() => {
    const updatePath = async () => {
      let branchName = "";
      if (mode === "existing" && localBranches[branchIndex]) {
        branchName = localBranches[branchIndex]?.name || "";
      } else if (mode === "new") {
        branchName = newBranchName || "new-branch";
      } else if (mode === "commit") {
        branchName = commitRef || "detached";
      }
      if (branchName) {
        const path = await getWorktreePath(branchName);
        setSuggestedPath(path);
      }
    };
    updatePath();
  }, [mode, branchIndex, newBranchName, commitRef, localBranches]);

  useInput((input, key) => {
    if (key.escape) {
      if (step === "mode") {
        onCancel();
      } else if (step === "input") {
        setStep("mode");
      } else {
        setStep("input");
      }
      return;
    }

    if (step === "mode") {
      if (key.upArrow) {
        const currentIdx = modeOptions.findIndex((m) => m.mode === mode);
        const newIdx = currentIdx > 0 ? currentIdx - 1 : modeOptions.length - 1;
        setMode(modeOptions[newIdx]!.mode);
      } else if (key.downArrow) {
        const currentIdx = modeOptions.findIndex((m) => m.mode === mode);
        const newIdx = currentIdx < modeOptions.length - 1 ? currentIdx + 1 : 0;
        setMode(modeOptions[newIdx]!.mode);
      } else if (key.return) {
        setStep("input");
      }
      return;
    }

    if (step === "input") {
      if (mode === "existing") {
        if (key.upArrow) {
          setBranchIndex((i) => (i > 0 ? i - 1 : localBranches.length - 1));
        } else if (key.downArrow) {
          setBranchIndex((i) => (i < localBranches.length - 1 ? i + 1 : 0));
        } else if (key.return) {
          setStep("path");
        }
      } else if (mode === "new" || mode === "commit") {
        if (key.return) {
          if (mode === "new" && newBranchName) {
            setStep("path");
          } else if (mode === "commit" && commitRef) {
            setStep("path");
          }
        } else if (key.backspace || key.delete) {
          if (mode === "new") {
            setNewBranchName((s) => s.slice(0, -1));
          } else {
            setCommitRef((s) => s.slice(0, -1));
          }
        } else if (input && !key.ctrl && !key.meta) {
          if (mode === "new") {
            setNewBranchName((s) => s + input);
          } else {
            setCommitRef((s) => s + input);
          }
        }
      }
      return;
    }

    if (step === "path") {
      if (key.tab) {
        setUseCustomPath(!useCustomPath);
      } else if (key.return) {
        const finalPath = useCustomPath ? customPath : suggestedPath;
        if (!finalPath) return;

        if (mode === "existing") {
          onSubmit({ path: finalPath, branch: localBranches[branchIndex]?.name });
        } else if (mode === "new") {
          onSubmit({ path: finalPath, newBranch: newBranchName });
        } else {
          onSubmit({ path: finalPath, commit: commitRef });
        }
      } else if (useCustomPath) {
        if (key.backspace || key.delete) {
          setCustomPath((s) => s.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setCustomPath((s) => s + input);
        }
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold underline>
          Create Worktree
        </Text>
      </Box>

      {step === "mode" && (
        <Box flexDirection="column">
          <Text dimColor>Select creation mode:</Text>
          {modeOptions.map((opt) => (
            <Box key={opt.mode}>
              <Text color={mode === opt.mode ? "cyan" : undefined}>
                {mode === opt.mode ? "> " : "  "}
                {opt.label}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {step === "input" && mode === "existing" && (
        <Box flexDirection="column">
          <Text dimColor>Select branch:</Text>
          {localBranches.map((b, i) => (
            <Box key={b.name}>
              <Text color={i === branchIndex ? "cyan" : undefined}>
                {i === branchIndex ? "> " : "  "}
                {b.name}
                {b.isCurrent && <Text dimColor> (current)</Text>}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {step === "input" && mode === "new" && (
        <Box flexDirection="column">
          <Text dimColor>Enter new branch name:</Text>
          <Box>
            <Text color="cyan">{"> "}</Text>
            <Text>{newBranchName}</Text>
            <Text color="gray">|</Text>
          </Box>
        </Box>
      )}

      {step === "input" && mode === "commit" && (
        <Box flexDirection="column">
          <Text dimColor>Enter commit hash or tag:</Text>
          <Box>
            <Text color="cyan">{"> "}</Text>
            <Text>{commitRef}</Text>
            <Text color="gray">|</Text>
          </Box>
        </Box>
      )}

      {step === "path" && (
        <Box flexDirection="column">
          <Text dimColor>Worktree path [Tab to toggle]:</Text>
          <Box>
            <Text color={!useCustomPath ? "cyan" : "gray"}>
              {!useCustomPath ? "> " : "  "}
              Default: {suggestedPath}
            </Text>
          </Box>
          <Box>
            <Text color={useCustomPath ? "cyan" : "gray"}>
              {useCustomPath ? "> " : "  "}
              Custom: {customPath}
              {useCustomPath && <Text color="gray">|</Text>}
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
