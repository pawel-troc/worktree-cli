import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  getAvailablePresets,
  getPresetByCommand,
  type CommandPreset,
} from "../utils/presets.ts";
import { Legend } from "./Legend.tsx";

interface PresetPickerProps {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
}

type Mode = "loading" | "presets" | "custom";

export function PresetPicker({ value, onChange, onCancel }: PresetPickerProps) {
  const [mode, setMode] = useState<Mode>("loading");
  const [presets, setPresets] = useState<CommandPreset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | undefined>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customValue, setCustomValue] = useState(value);

  // Total options = presets + "Custom command..."
  const totalOptions = presets.length + 1;

  useEffect(() => {
    getAvailablePresets().then(({ presets: available, defaultPreset }) => {
      setPresets(available);
      setDefaultPresetId(defaultPreset?.id);

      // Try to select the matching preset if value matches one
      const matchingPreset = getPresetByCommand(value);
      if (matchingPreset) {
        const index = available.findIndex((p) => p.id === matchingPreset.id);
        if (index >= 0) {
          setSelectedIndex(index);
        }
      } else if (value && value.trim() !== "") {
        // Value doesn't match any preset, start in custom mode
        setSelectedIndex(available.length); // Select "Custom command..."
      }
      // Otherwise, default terminal is already first (index 0)
      setMode("presets");
    });
  }, []);

  useInput((input, key) => {
    if (mode === "loading") return;

    if (mode === "custom") {
      if (key.return) {
        onChange(customValue);
      } else if (key.escape) {
        setMode("presets");
        setCustomValue(value);
      } else if (key.backspace || key.delete) {
        setCustomValue((s) => s.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setCustomValue((s) => s + input);
      }
      return;
    }

    // Presets mode
    if (key.escape) {
      onCancel();
    } else if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : totalOptions - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => (i < totalOptions - 1 ? i + 1 : 0));
    } else if (key.return) {
      if (selectedIndex === presets.length) {
        // "Custom command..." selected
        setMode("custom");
      } else {
        const preset = presets[selectedIndex];
        if (preset) {
          onChange(preset.command);
        }
      }
    }
  });

  if (mode === "loading") {
    return <Text dimColor>Detecting installed terminals...</Text>;
  }

  if (mode === "custom") {
    return (
      <Box flexDirection="column">
        <Box>
          <Text>Custom: </Text>
          <Text color="yellow">{customValue}</Text>
          <Text color="gray">|</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor italic>
            Use {"{path}"} as placeholder for worktree path
          </Text>
        </Box>
        <Box marginTop={1}>
          <Legend text="[Enter] Save • [Esc] Back to presets" />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {presets.map((preset, i) => {
        const isSelected = i === selectedIndex;
        const isDefault = preset.id === defaultPresetId;
        const label = isDefault
          ? `${preset.label} (default)`
          : preset.label;
        return (
          <Box key={preset.id}>
            <Text color={isSelected ? "cyan" : undefined}>
              {isSelected ? "> " : "  "}
              {label.padEnd(24)}
            </Text>
            <Text dimColor>{preset.command}</Text>
          </Box>
        );
      })}
      <Box>
        <Text color={selectedIndex === presets.length ? "cyan" : undefined}>
          {selectedIndex === presets.length ? "> " : "  "}
          Custom command...
        </Text>
      </Box>
      <Box marginTop={1}>
        <Legend text="[↑↓] Navigate • [Enter] Select • [Esc] Cancel" />
      </Box>
    </Box>
  );
}
