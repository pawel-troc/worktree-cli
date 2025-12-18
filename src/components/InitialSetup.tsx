import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  type Config,
} from "../utils/config.ts";
import { PresetPicker } from "./PresetPicker.tsx";

interface InitialSetupProps {
  onComplete: () => void;
}

type SettingField = "defaultWorktreePath" | "postCreateCommand" | "filesToCopy";

const SETTINGS_INFO: Record<SettingField, { label: string; hint: string }> = {
  defaultWorktreePath: {
    label: "Default worktree path",
    hint: "Use {repo} and {branch} as placeholders",
  },
  postCreateCommand: {
    label: "Post-create command",
    hint: "Use {path} as placeholder. Leave empty to disable.",
  },
  filesToCopy: {
    label: "Files to copy",
    hint: "Glob patterns for files to copy to new worktrees (comma-separated)",
  },
};

const FIELDS: SettingField[] = [
  "defaultWorktreePath",
  "postCreateCommand",
  "filesToCopy",
];

function getFieldValue(config: Config, field: SettingField): string {
  if (field === "filesToCopy") {
    return config.filesToCopy.join(", ");
  }
  return config[field];
}

function setFieldValue(
  config: Config,
  field: SettingField,
  value: string
): Config {
  if (field === "filesToCopy") {
    const patterns = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return { ...config, filesToCopy: patterns };
  }
  return { ...config, [field]: value };
}

export function InitialSetup({ onComplete }: InitialSetupProps) {
  const [config, setConfig] = useState<Config>(getDefaultConfig());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  // Total items = fields + Save button
  const totalItems = FIELDS.length + 1;
  const isSaveSelected = selectedIndex === FIELDS.length;

  useInput(
    (input, key) => {
      if (editing) {
        if (key.return) {
          const field = FIELDS[selectedIndex];
          if (field) {
            setConfig(setFieldValue(config, field, editValue));
          }
          setEditing(false);
          setEditValue("");
        } else if (key.escape) {
          setEditing(false);
          setEditValue("");
        } else if (key.backspace || key.delete) {
          setEditValue((s) => s.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setEditValue((s) => s + input);
        }
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : totalItems - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => (i < totalItems - 1 ? i + 1 : 0));
      } else if (key.return) {
        if (isSaveSelected) {
          saveConfig(config).then(() => {
            onComplete();
          });
        } else {
          const field = FIELDS[selectedIndex];
          if (field) {
            if (field === "postCreateCommand") {
              setShowPresetPicker(true);
            } else {
              setEditValue(getFieldValue(config, field));
              setEditing(true);
            }
          }
        }
      }
    },
    { isActive: !showPresetPicker }
  );

  const handlePresetSelect = (value: string) => {
    setConfig((c) => ({ ...c, postCreateCommand: value }));
    setShowPresetPicker(false);
  };

  const handlePresetCancel = () => {
    setShowPresetPicker(false);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          Welcome to Worktree CLI
        </Text>
        <Text dimColor>
          Let's configure your settings before getting started.
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text bold underline>
          Configuration
        </Text>
      </Box>

      {FIELDS.map((field, i) => {
        const info = SETTINGS_INFO[field];
        const isSelected = i === selectedIndex;
        const isEditing = isSelected && editing;
        const isPresetPickerOpen = isSelected && showPresetPicker && field === "postCreateCommand";

        return (
          <Box key={field} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={isSelected ? "cyan" : undefined}>
                {isSelected ? "> " : "  "}
                {info.label}:
              </Text>
            </Box>
            <Box marginLeft={4}>
              {isPresetPickerOpen ? (
                <PresetPicker
                  value={config.postCreateCommand}
                  onChange={handlePresetSelect}
                  onCancel={handlePresetCancel}
                />
              ) : isEditing ? (
                <Box>
                  <Text color="yellow">{editValue}</Text>
                  <Text color="gray">|</Text>
                </Box>
              ) : (
                <Text dimColor>
                  {getFieldValue(config, field) || "(empty)"}
                </Text>
              )}
            </Box>
            {isSelected && !editing && !isPresetPickerOpen && (
              <Box marginLeft={4}>
                <Text dimColor italic>
                  {info.hint}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text color={isSaveSelected ? "green" : undefined} bold={isSaveSelected}>
          {isSaveSelected ? "> " : "  "}
          Save and Continue
        </Text>
      </Box>

      {!showPresetPicker && (
        <Box marginTop={1}>
          <Text dimColor>
            {editing
              ? "[Enter] Save • [Esc] Cancel"
              : "[Enter] Edit/Select • [↑↓] Navigate"}
          </Text>
        </Box>
      )}
    </Box>
  );
}
