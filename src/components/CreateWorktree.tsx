import React, { useState, useEffect, useMemo } from "react";
import type { Branch } from "../utils/git.ts";
import { getWorktreePath } from "../utils/config.ts";
import { Wizard } from "./wizard/Wizard.tsx";
import type { WizardStep } from "../types/wizard.ts";

interface CreateWorktreeData extends Record<string, unknown> {
  mode: "existing" | "new";
  branch: string;
  newBranchName: string;
  pathChoice: "default" | "custom";
  customPath: string;
}

interface CreateWorktreeProps {
  branches: Branch[];
  onSubmit: (options: {
    path: string;
    branch?: string;
    newBranch?: string;
  }) => void;
  onCancel: () => void;
}

export function CreateWorktree({
  branches,
  onSubmit,
  onCancel,
}: CreateWorktreeProps) {
  const [suggestedPath, setSuggestedPath] = useState("");
  const [currentBranch, setCurrentBranch] = useState("");

  const localBranches = useMemo(
    () => branches.filter((b) => !b.isRemote),
    [branches]
  );

  // Compute suggested path when branch changes
  useEffect(() => {
    const updatePath = async () => {
      if (currentBranch) {
        const path = await getWorktreePath(currentBranch);
        setSuggestedPath(path);
      }
    };
    updatePath();
  }, [currentBranch]);

  // Set initial branch
  useEffect(() => {
    if (localBranches.length > 0 && !currentBranch) {
      setCurrentBranch(localBranches[0]?.name || "");
    }
  }, [localBranches, currentBranch]);

  const steps: WizardStep<CreateWorktreeData>[] = useMemo(
    () => [
      // Step 1: Mode selection
      {
        id: "mode",
        type: "selection",
        label: "Mode",
        dataKey: "mode",
        prompt: "Select creation mode:",
        options: [
          { value: "existing", label: "From existing branch" },
          { value: "new", label: "Create new branch" },
        ],
        formatValue: (v) =>
          v === "existing" ? "From existing branch" : "Create new branch",
      },

      // Step 2a: Branch selection (for existing mode)
      {
        id: "branch",
        type: "selection",
        label: "Branch",
        dataKey: "branch",
        prompt: "Select branch:",
        skipIf: (data) => data.mode === "new",
        options: localBranches.map((b) => ({
          value: b.name,
          label: b.name,
          suffix: b.isCurrent ? "(current)" : undefined,
        })),
      },

      // Step 2b: New branch name (for new mode)
      {
        id: "newBranchName",
        type: "text",
        label: "New branch",
        dataKey: "newBranchName",
        prompt: "Enter new branch name:",
        placeholder: "feature/my-branch",
        skipIf: (data) => data.mode === "existing",
        validate: (value) => {
          if (!value || (value as string).trim() === "") {
            return "Branch name is required";
          }
          return null;
        },
      },

      // Step 3: Path selection
      {
        id: "pathChoice",
        type: "selection",
        label: "Path",
        dataKey: "pathChoice",
        prompt: "Worktree path:",
        options: () => [
          {
            value: "default",
            label: `Default: ${suggestedPath || "(computing...)"}`,
          },
          { value: "custom", label: "Custom path" },
        ],
        formatValue: (v) => (v === "default" ? suggestedPath : "Custom"),
      },

      // Step 4: Custom path input (if custom selected)
      {
        id: "customPath",
        type: "text",
        label: "Custom path",
        dataKey: "customPath",
        prompt: "Enter custom path:",
        skipIf: (data) => data.pathChoice === "default",
        validate: (value) => {
          if (!value || (value as string).trim() === "") {
            return "Path is required";
          }
          return null;
        },
      },
    ],
    [localBranches, suggestedPath]
  );

  const handleComplete = async (data: CreateWorktreeData) => {
    // Compute final path
    let finalPath: string;
    if (data.pathChoice === "custom") {
      finalPath = data.customPath;
    } else {
      // Recompute path based on final branch selection
      const branchName =
        data.mode === "existing" ? data.branch : data.newBranchName;
      finalPath = await getWorktreePath(branchName);
    }

    if (data.mode === "existing") {
      onSubmit({ path: finalPath, branch: data.branch });
    } else {
      onSubmit({ path: finalPath, newBranch: data.newBranchName });
    }
  };

  // Update currentBranch when wizard data might change
  // This is handled via the step options being dynamic
  const handleDataChange = (data: Partial<CreateWorktreeData>) => {
    const branchName =
      data.mode === "existing"
        ? data.branch || localBranches[0]?.name || ""
        : data.newBranchName || "new-branch";
    if (branchName !== currentBranch) {
      setCurrentBranch(branchName);
    }
  };

  return (
    <WizardWithDataTracking<CreateWorktreeData>
      title="Create Worktree"
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
      onDataChange={handleDataChange}
      initialData={{
        mode: "existing",
        branch: localBranches[0]?.name || "",
        newBranchName: "",
        pathChoice: "default",
        customPath: "",
      }}
    />
  );
}

// Extended Wizard that tracks data changes
import { Box, Text } from "ink";
import { useWizard } from "../hooks/useWizard.ts";
import { SelectionStep } from "./wizard/SelectionStep.tsx";
import { TextInputStep } from "./wizard/TextInputStep.tsx";
import { ConfirmationStep } from "./wizard/ConfirmationStep.tsx";
import { WizardSummary } from "./wizard/WizardSummary.tsx";

interface WizardWithDataTrackingProps<TData extends Record<string, unknown>> {
  title: string;
  steps: WizardStep<TData>[];
  initialData: Partial<TData>;
  onComplete: (data: TData) => void;
  onCancel: () => void;
  onDataChange: (data: Partial<TData>) => void;
}

function WizardWithDataTracking<TData extends Record<string, unknown>>({
  title,
  steps,
  initialData,
  onComplete,
  onCancel,
  onDataChange,
}: WizardWithDataTrackingProps<TData>) {
  const wizard = useWizard(steps, initialData);
  const {
    state,
    submitStep: originalSubmitStep,
    prevStep,
    editStep,
    activeSteps,
    currentStep,
    setSelectionIndex,
    setTextValue,
  } = wizard;

  // Track data changes
  useEffect(() => {
    onDataChange(state.data);
  }, [state.data, onDataChange]);

  const submitStep = (value: unknown) => {
    originalSubmitStep(value);
  };

  const handleBack = () => {
    if (state.currentStepIndex === 0 && state.phase === "steps") {
      onCancel();
    } else if (state.phase === "editing") {
      wizard.returnToSummary();
    } else {
      prevStep();
    }
  };

  const handleConfirm = () => {
    onComplete(state.data as TData);
  };

  // Render summary phase
  if (state.phase === "summary") {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold underline>
            {title}
          </Text>
        </Box>
        <WizardSummary
          data={state.data as TData}
          steps={activeSteps}
          selectedIndex={state.selectionIndex}
          onEdit={editStep}
          onConfirm={handleConfirm}
          onCancel={onCancel}
          onSelectionChange={setSelectionIndex}
        />
      </Box>
    );
  }

  if (!currentStep) {
    return null;
  }

  const isEditing = state.phase === "editing";

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold underline>
          {title}
        </Text>
        <Text dimColor>
          {" "}
          (Step {state.currentStepIndex + 1}/{activeSteps.length})
        </Text>
        {isEditing && <Text color="yellow"> [Editing]</Text>}
      </Box>

      {currentStep.type === "selection" && (
        <SelectionStep
          step={currentStep}
          data={state.data}
          selectedIndex={state.selectionIndex}
          onSelect={submitStep}
          onSelectionChange={setSelectionIndex}
          onBack={handleBack}
        />
      )}

      {currentStep.type === "text" && (
        <TextInputStep
          step={currentStep}
          value={state.textValue}
          onSubmit={submitStep}
          onChange={setTextValue}
          onBack={handleBack}
          error={state.error}
        />
      )}

      {currentStep.type === "confirmation" && (
        <ConfirmationStep
          step={currentStep}
          data={state.data}
          onConfirm={submitStep}
          onBack={handleBack}
        />
      )}
    </Box>
  );
}
