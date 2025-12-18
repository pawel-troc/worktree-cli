import React from "react";
import { Box, Text } from "ink";
import { useWizard } from "../../hooks/useWizard.ts";
import { SelectionStep } from "./SelectionStep.tsx";
import { TextInputStep } from "./TextInputStep.tsx";
import { ConfirmationStep } from "./ConfirmationStep.tsx";
import { WizardSummary } from "./WizardSummary.tsx";
import type { WizardProps } from "../../types/wizard.ts";

export function Wizard<TData extends Record<string, unknown>>({
  title,
  titleColor,
  steps,
  initialData = {} as Partial<TData>,
  onComplete,
  onCancel,
  showProgress = true,
}: WizardProps<TData>) {
  const wizard = useWizard(steps, initialData);
  const {
    state,
    submitStep,
    prevStep,
    editStep,
    activeSteps,
    currentStep,
    setSelectionIndex,
    setTextValue,
  } = wizard;

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
          <Text bold underline color={titleColor}>
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

  // Render current step
  if (!currentStep) {
    return null;
  }

  const isEditing = state.phase === "editing";

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold underline color={titleColor}>
          {title}
        </Text>
        {showProgress && (
          <Text dimColor>
            {" "}
            (Step {state.currentStepIndex + 1}/{activeSteps.length})
          </Text>
        )}
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
