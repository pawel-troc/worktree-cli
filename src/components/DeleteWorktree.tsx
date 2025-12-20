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

  // Determine if force deletion is required
  const requiresForce = worktree.isLocked || worktree.hasChanges;

  // Build the force label based on why force is needed
  const forceLabel = useMemo(() => {
    const reasons: string[] = [];
    if (worktree.isLocked) reasons.push("locked");
    if (worktree.hasChanges) reasons.push("uncommitted changes");
    return `Yes, force delete (${reasons.join(", ")})`;
  }, [worktree.isLocked, worktree.hasChanges]);

  const steps: WizardStep<DeleteWorktreeData>[] = useMemo(() => {
    const worktreeOptions = requiresForce
      ? [
          { value: "force", label: forceLabel },
          { value: "no", label: "No, keep it" },
        ]
      : [
          { value: "yes", label: "Yes, delete it" },
          { value: "no", label: "No, keep it" },
        ];

    // Build prompt with warnings
    let prompt = `Delete worktree "${branchDisplay}"?`;
    if (worktree.isCurrent) {
      prompt += "\n\n⚠️  Warning: You are currently inside this worktree!";
      prompt += "\n   The CLI will exit after deletion and you'll need to navigate out.";
    }
    if (worktree.hasChanges) {
      prompt += "\n\n⚠️  Warning: This worktree has uncommitted changes that will be lost!";
    }

    return [
      // Step 1: Delete worktree confirmation
      {
        id: "deleteWorktree",
        type: "selection",
        label: "Delete worktree",
        dataKey: "deleteWorktree",
        prompt,
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
  }, [worktree, branchDisplay, requiresForce, forceLabel]);

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
        deleteWorktree: requiresForce ? "force" : "yes",
        deleteBranch: "no",
      }}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}
