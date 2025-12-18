import React, { useMemo } from "react";
import type { Worktree } from "../utils/git.ts";
import { Wizard } from "./wizard/Wizard.tsx";
import type { WizardStep } from "../types/wizard.ts";

interface DeleteWorktreeData extends Record<string, unknown> {
  deleteWorktree: "yes" | "force" | "no";
  deleteBranch: "yes" | "no";
}

interface DeleteWorktreeProps {
  worktree: Worktree;
  onConfirm: (options: { force: boolean; deleteBranch: boolean }) => void;
  onCancel: () => void;
}

export function DeleteWorktree({
  worktree,
  onConfirm,
  onCancel,
}: DeleteWorktreeProps) {
  const branchDisplay = worktree.branch || worktree.head.substring(0, 7);

  const steps: WizardStep<DeleteWorktreeData>[] = useMemo(() => {
    const worktreeOptions = worktree.isLocked
      ? [
          { value: "force", label: "Yes, force delete (locked)" },
          { value: "no", label: "No, keep it" },
        ]
      : [
          { value: "yes", label: "Yes, delete it" },
          { value: "no", label: "No, keep it" },
        ];

    return [
      // Step 1: Delete worktree confirmation
      {
        id: "deleteWorktree",
        type: "selection",
        label: "Delete worktree",
        dataKey: "deleteWorktree",
        prompt: `Delete worktree "${branchDisplay}"?`,
        options: worktreeOptions,
        formatValue: (v) => {
          if (v === "yes") return "Yes";
          if (v === "force") return "Yes (force)";
          return "No";
        },
      },

      // Step 2: Delete branch (only if worktree has a branch and user chose to delete)
      {
        id: "deleteBranch",
        type: "selection",
        label: "Delete branch",
        dataKey: "deleteBranch",
        prompt: `Also delete the branch "${worktree.branch}"?`,
        skipIf: (data) =>
          !worktree.branch || data.deleteWorktree === "no",
        options: [
          { value: "yes", label: "Yes, delete the branch" },
          { value: "no", label: "No, keep the branch" },
        ],
        formatValue: (v) => (v === "yes" ? "Yes" : "No"),
      },
    ];
  }, [worktree, branchDisplay]);

  const handleComplete = (data: DeleteWorktreeData) => {
    if (data.deleteWorktree === "no") {
      onCancel();
      return;
    }

    onConfirm({
      force: data.deleteWorktree === "force",
      deleteBranch: data.deleteBranch === "yes",
    });
  };

  return (
    <Wizard<DeleteWorktreeData>
      title="Delete Worktree"
      titleColor="red"
      steps={steps}
      initialData={{
        deleteWorktree: worktree.isLocked ? "force" : "yes",
        deleteBranch: "no",
      }}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}
