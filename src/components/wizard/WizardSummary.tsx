import React from "react";
import { Box, Text, useInput } from "ink";
import type { WizardStep } from "../../types/wizard.ts";

interface WizardSummaryProps<TData> {
  data: TData;
  steps: WizardStep<TData>[];
  selectedIndex: number;
  onEdit: (stepIndex: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectionChange: (index: number) => void;
}

export function WizardSummary<TData extends Record<string, unknown>>({
  data,
  steps,
  selectedIndex,
  onEdit,
  onConfirm,
  onCancel,
  onSelectionChange,
}: WizardSummaryProps<TData>) {
  // Items: all steps + Confirm + Cancel
  const totalItems = steps.length + 2;
  const confirmIndex = steps.length;
  const cancelIndex = steps.length + 1;

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow) {
      onSelectionChange(selectedIndex > 0 ? selectedIndex - 1 : totalItems - 1);
      return;
    }

    if (key.downArrow) {
      onSelectionChange(selectedIndex < totalItems - 1 ? selectedIndex + 1 : 0);
      return;
    }

    if (key.return) {
      if (selectedIndex < steps.length) {
        onEdit(selectedIndex);
      } else if (selectedIndex === confirmIndex) {
        onConfirm();
      } else if (selectedIndex === cancelIndex) {
        onCancel();
      }
    }
  });

  const formatStepValue = (step: WizardStep<TData>): string => {
    const value = data[step.dataKey];
    if (step.formatValue) {
      return step.formatValue(value, data);
    }
    if (value === undefined || value === null) {
      return "(not set)";
    }
    return String(value);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold underline>
          Summary
        </Text>
      </Box>

      {/* Step values - each editable */}
      {steps.map((step, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={step.id}>
            <Text color={isSelected ? "cyan" : undefined}>
              {isSelected ? "> " : "  "}
            </Text>
            <Text dimColor>{step.label}: </Text>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {formatStepValue(step)}
            </Text>
            {isSelected && <Text dimColor> [Enter to edit]</Text>}
          </Box>
        );
      })}

      <Box marginTop={1} flexDirection="column">
        {/* Confirm option */}
        <Box>
          <Text color={selectedIndex === confirmIndex ? "green" : undefined}>
            {selectedIndex === confirmIndex ? "> " : "  "}
            Confirm
          </Text>
        </Box>

        {/* Cancel option */}
        <Box>
          <Text color={selectedIndex === cancelIndex ? "red" : undefined}>
            {selectedIndex === cancelIndex ? "> " : "  "}
            Cancel
          </Text>
        </Box>
      </Box>

    </Box>
  );
}
