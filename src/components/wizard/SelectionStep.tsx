import React from "react";
import { Box, Text, useInput } from "ink";
import type { SelectionStep as SelectionStepType, SelectionOption } from "../../types/wizard.ts";

interface SelectionStepProps<TData> {
  step: SelectionStepType<TData>;
  data: Partial<TData>;
  selectedIndex: number;
  onSelect: (value: string) => void;
  onSelectionChange: (index: number) => void;
  onBack: () => void;
}

export function SelectionStep<TData>({
  step,
  data,
  selectedIndex,
  onSelect,
  onSelectionChange,
  onBack,
}: SelectionStepProps<TData>) {
  const options: SelectionOption[] =
    typeof step.options === "function" ? step.options(data) : step.options;

  useInput((input, key) => {
    if (key.escape) {
      onBack();
      return;
    }

    if (key.upArrow) {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
      onSelectionChange(newIndex);
      return;
    }

    if (key.downArrow) {
      const newIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
      onSelectionChange(newIndex);
      return;
    }

    if (key.return) {
      const selected = options[selectedIndex];
      if (selected && !selected.disabled) {
        onSelect(selected.value);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text dimColor>{step.prompt}</Text>
      {options.map((option, i) => (
        <Box key={`${option.value}-${i}`}>
          <Text
            color={i === selectedIndex ? "cyan" : option.disabled ? "gray" : undefined}
            dimColor={option.disabled}
          >
            {i === selectedIndex ? "> " : "  "}
            {option.label}
            {option.suffix && <Text dimColor> {option.suffix}</Text>}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
