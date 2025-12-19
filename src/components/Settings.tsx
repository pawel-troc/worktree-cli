import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { loadConfig, saveConfig, type Config } from "../utils/config.ts";
import { PresetPicker } from "./PresetPicker.tsx";
import { Legend } from "./Legend.tsx";

interface SettingsProps {
  repoRoot: string;
  onClose: () => void;
}

type SettingField = "defaultWorktreePath" | "postCreateCommand" | "filesToCopy" | "enforceBranchConvention" | "branchPrefixes";

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
  enforceBranchConvention: {
    label: "Enforce branch naming convention",
    hint: "Require branch prefixes when creating new branches",
  },
  branchPrefixes: {
    label: "Branch prefixes",
    hint: "Comma-separated list of allowed prefixes (e.g., feature, bugfix, hotfix)",
  },
};

const BASE_FIELDS: SettingField[] = [
  "defaultWorktreePath",
  "postCreateCommand",
  "filesToCopy",
  "enforceBranchConvention",
];

function getFieldValue(config: Config, field: SettingField): string {
  if (field === "filesToCopy") {
    return config.filesToCopy.join(", ");
  }
  if (field === "branchPrefixes") {
    return config.branchPrefixes.join(", ");
  }
  if (field === "enforceBranchConvention") {
    return config.enforceBranchConvention ? "Yes" : "No";
  }
  return config[field];
}

function getActiveFields(config: Config): SettingField[] {
  if (config.enforceBranchConvention) {
    return [...BASE_FIELDS, "branchPrefixes"];
  }
  return BASE_FIELDS;
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
  if (field === "branchPrefixes") {
    const prefixes = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return { ...config, branchPrefixes: prefixes };
  }
  if (field === "enforceBranchConvention") {
    return { ...config, enforceBranchConvention: !config.enforceBranchConvention };
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

  const activeFields = config ? getActiveFields(config) : BASE_FIELDS;

  // Clamp selectedField when activeFields changes
  useEffect(() => {
    if (selectedField >= activeFields.length) {
      setSelectedField(activeFields.length - 1);
    }
  }, [activeFields.length, selectedField]);

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
          const field = activeFields[selectedField];
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
        setSelectedField((i) => (i > 0 ? i - 1 : activeFields.length - 1));
      } else if (key.downArrow) {
        setSelectedField((i) => (i < activeFields.length - 1 ? i + 1 : 0));
      } else if (key.return) {
        const field = activeFields[selectedField];
        if (field) {
          if (field === "postCreateCommand") {
            setShowPresetPicker(true);
          } else if (field === "enforceBranchConvention") {
            // Toggle boolean field
            const newConfig = setFieldValue(config, field, "");
            setConfig(newConfig);
            saveConfig(newConfig, repoRoot).then(() => {
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            });
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

      {activeFields.map((field, i) => {
        const info = SETTINGS_INFO[field];
        const isSelected = i === selectedField;
        const isEditing = isSelected && editing;
        const isPresetPickerOpen = isSelected && showPresetPicker && field === "postCreateCommand";
        const isToggle = field === "enforceBranchConvention";

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
              ) : isToggle ? (
                <Text color={config.enforceBranchConvention ? "green" : "red"}>
                  {config.enforceBranchConvention ? "Yes" : "No"}
                </Text>
              ) : (
                <Text dimColor>
                  {getFieldValue(config, field) || "(empty)"}
                </Text>
              )}
            </Box>
            {isSelected && !isPresetPickerOpen && (
              <Box marginLeft={4}>
                <Text dimColor italic>
                  {isToggle ? "[Enter] Toggle" : info.hint}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}

      {!showPresetPicker && (
        <Box marginTop={1}>
          <Legend
            text={
              editing
                ? "[Enter] Save • [Esc] Cancel"
                : "[Enter] Edit • [↑↓] Navigate • [Esc] Back"
            }
          />
        </Box>
      )}
    </Box>
  );
}
