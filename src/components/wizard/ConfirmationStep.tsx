import React from "react";
import { Box, Text, useInput } from "ink";
import type { ConfirmationStep as ConfirmationStepType } from "../../types/wizard.ts";

interface ConfirmationStepProps<TData> {
  step: ConfirmationStepType<TData>;
  data: Partial<TData>;
  onConfirm: (value: unknown) => void;
  onBack: () => void;
}

export function ConfirmationStep<TData>({
  step,
  data,
  onConfirm,
  onBack,
}: ConfirmationStepProps<TData>) {
  const details = step.details?.(data) ?? [];
  const warning = step.warning?.(data);

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    const option = step.confirmOptions.find(
      (o) => o.key.toLowerCase() === input.toLowerCase()
    );
    if (option) {
      onConfirm(option.value);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>{step.prompt}</Text>

      {details.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {details.map((detail, i) => (
            <Box key={i}>
              <Text dimColor>{detail.label}: </Text>
              <Text bold>{detail.value}</Text>
            </Box>
          ))}
        </Box>
      )}

      {warning && (
        <Box marginTop={1}>
          <Text color="yellow">{warning}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          {step.confirmOptions.map((o) => `[${o.key}] ${o.label}`).join(" | ")}
          {" | [Esc] Back"}
        </Text>
      </Box>
    </Box>
  );
}
