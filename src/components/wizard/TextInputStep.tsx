import React from "react";
import { Box, Text, useInput } from "ink";
import type { TextInputStep as TextInputStepType } from "../../types/wizard.ts";

interface TextInputStepProps<TData> {
  step: TextInputStepType<TData>;
  value: string;
  onSubmit: (value: string) => void;
  onChange: (value: string) => void;
  onBack: () => void;
  error: string | null;
}

export function TextInputStep<TData>({
  step,
  value,
  onSubmit,
  onChange,
  onBack,
  error,
}: TextInputStepProps<TData>) {
  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (key.return && value.trim()) {
      onSubmit(value);
      return;
    }

    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
      return;
    }

    if (input && !key.ctrl && !key.meta) {
      onChange(value + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>{step.prompt}</Text>
      <Box>
        <Text color="cyan">{"> "}</Text>
        <Text>{value || ""}</Text>
        {step.showCursor !== false && <Text color="gray">|</Text>}
      </Box>
      {!value && step.placeholder && (
        <Box>
          <Text dimColor>  {step.placeholder}</Text>
        </Box>
      )}
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
    </Box>
  );
}
