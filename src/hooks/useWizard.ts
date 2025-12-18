import { useState, useCallback, useMemo } from "react";
import type { WizardStep, WizardState, WizardPhase } from "../types/wizard.ts";

export interface UseWizardReturn<TData> {
  state: WizardState<TData>;
  nextStep: () => void;
  prevStep: () => void;
  submitStep: (value: unknown) => void;
  goToSummary: () => void;
  editStep: (stepIndex: number) => void;
  returnToSummary: () => void;
  activeSteps: WizardStep<TData>[];
  currentStep: WizardStep<TData> | null;
  setSelectionIndex: (index: number) => void;
  setTextValue: (value: string) => void;
  setError: (error: string | null) => void;
}

export function useWizard<TData extends Record<string, unknown>>(
  steps: WizardStep<TData>[],
  initialData: Partial<TData> = {}
): UseWizardReturn<TData> {
  const [state, setState] = useState<WizardState<TData>>({
    currentStepIndex: 0,
    phase: "steps",
    editingStepIndex: null,
    data: initialData,
    error: null,
    selectionIndex: 0,
    textValue: "",
  });

  // Compute active steps (excluding skipped ones)
  const activeSteps = useMemo(() => {
    return steps.filter((step) => !step.skipIf?.(state.data));
  }, [steps, state.data]);

  const currentStep = activeSteps[state.currentStepIndex] ?? null;

  const nextStep = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex >= activeSteps.length) {
        return { ...prev, phase: "summary" as WizardPhase, selectionIndex: 0 };
      }
      return {
        ...prev,
        currentStepIndex: nextIndex,
        selectionIndex: 0,
        textValue: "",
        error: null,
      };
    });
  }, [activeSteps.length]);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.phase === "editing") {
        return { ...prev, phase: "summary" as WizardPhase, editingStepIndex: null };
      }
      const prevIndex = prev.currentStepIndex - 1;
      if (prevIndex < 0) {
        return prev; // Let parent handle cancel
      }
      return { ...prev, currentStepIndex: prevIndex, error: null };
    });
  }, []);

  const submitStep = useCallback(
    (value: unknown) => {
      const step = currentStep;
      if (!step) return;

      // Validate
      const validationError = step.validate?.(value, state.data);
      if (validationError) {
        setState((prev) => ({ ...prev, error: validationError }));
        return;
      }

      setState((prev) => {
        const newData = { ...prev.data, [step.dataKey]: value };

        // If editing from summary, return to summary
        if (prev.phase === "editing") {
          return {
            ...prev,
            data: newData,
            phase: "summary" as WizardPhase,
            editingStepIndex: null,
            error: null,
            selectionIndex: 0,
          };
        }

        // Otherwise, go to next step
        // Recompute active steps with new data
        const newActiveSteps = steps.filter((s) => !s.skipIf?.(newData));
        const nextIndex = prev.currentStepIndex + 1;
        if (nextIndex >= newActiveSteps.length) {
          return {
            ...prev,
            data: newData,
            phase: "summary" as WizardPhase,
            error: null,
            selectionIndex: 0,
          };
        }
        return {
          ...prev,
          data: newData,
          currentStepIndex: nextIndex,
          selectionIndex: 0,
          textValue: "",
          error: null,
        };
      });
    },
    [currentStep, state.data, steps]
  );

  const editStep = useCallback(
    (stepIndex: number) => {
      const step = activeSteps[stepIndex];
      if (!step) return;

      const existingValue = state.data[step.dataKey];

      setState((prev) => {
        const options =
          step.type === "selection"
            ? typeof step.options === "function"
              ? step.options(prev.data)
              : step.options
            : [];

        return {
          ...prev,
          phase: "editing" as WizardPhase,
          currentStepIndex: stepIndex,
          editingStepIndex: stepIndex,
          textValue: step.type === "text" ? ((existingValue as string) ?? "") : "",
          selectionIndex:
            step.type === "selection"
              ? Math.max(
                  options.findIndex((o) => o.value === existingValue),
                  0
                )
              : 0,
        };
      });
    },
    [activeSteps, state.data]
  );

  const returnToSummary = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "summary" as WizardPhase,
      editingStepIndex: null,
      selectionIndex: 0,
    }));
  }, []);

  const goToSummary = useCallback(() => {
    setState((prev) => ({ ...prev, phase: "summary" as WizardPhase, selectionIndex: 0 }));
  }, []);

  const setSelectionIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, selectionIndex: index }));
  }, []);

  const setTextValue = useCallback((value: string) => {
    setState((prev) => ({ ...prev, textValue: value }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  return {
    state,
    nextStep,
    prevStep,
    submitStep,
    goToSummary,
    editStep,
    returnToSummary,
    activeSteps,
    currentStep,
    setSelectionIndex,
    setTextValue,
    setError,
  };
}
