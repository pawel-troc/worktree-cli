import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { loadConfig, saveConfig, type Config } from "../utils/config.ts";
import { PresetPicker } from "./PresetPicker.tsx";

interface SettingsProps {
  repoRoot: string;
  onClose: () => void;
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

export function Settings({ repoRoot, onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedField, setSelectedField] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  useEffect(() => {
    loadConfig(repoRoot).then(setConfig);
  }, [repoRoot]);

  useInput(
    (input, key) => {
      if (!config) return;

      if (key.escape) {
        if (editing) {
          setEditing(false);
          setEditValue("");
        } else {
          onClose();
        }
        return;
      }

      if (editing) {
        if (key.return) {
          const field = FIELDS[selectedField];
          if (field) {
            const newConfig = setFieldValue(config, field, editValue);
            setConfig(newConfig);
            saveConfig(newConfig, repoRoot).then(() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            });
          }
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
        setSelectedField((i) => (i > 0 ? i - 1 : FIELDS.length - 1));
      } else if (key.downArrow) {
        setSelectedField((i) => (i < FIELDS.length - 1 ? i + 1 : 0));
      } else if (key.return) {
        const field = FIELDS[selectedField];
        if (field) {
          if (field === "postCreateCommand") {
            setShowPresetPicker(true);
          } else {
            setEditValue(getFieldValue(config, field));
            setEditing(true);
          }
        }
      }
    },
    { isActive: !showPresetPicker }
  );

  const handlePresetSelect = (value: string) => {
    if (config) {
      const newConfig = { ...config, postCreateCommand: value };
      setConfig(newConfig);
      saveConfig(newConfig, repoRoot).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      });
    }
    setShowPresetPicker(false);
  };

  const handlePresetCancel = () => {
    setShowPresetPicker(false);
  };

  if (!config) {
    return <Text>Loading settings...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold underline>
          Settings
        </Text>
        {saved && <Text color="green"> (Saved!)</Text>}
      </Box>

      {FIELDS.map((field, i) => {
        const info = SETTINGS_INFO[field];
        const isSelected = i === selectedField;
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
            {isSelected && !isPresetPickerOpen && (
              <Box marginLeft={4}>
                <Text dimColor italic>
                  {info.hint}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      {!showPresetPicker && (
        <Box marginTop={1}>
          <Text dimColor>
            {editing
              ? "[Enter] Save • [Esc] Cancel"
              : "[Enter] Edit • [↑↓] Navigate • [Esc] Back"}
          </Text>
        </Box>
      )}
    </Box>
  );
}
