import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  loadConfig,
  saveConfig,
  getDefaultConfig,
  type Config,
} from "../utils/config.ts";
import { PresetPicker } from "./PresetPicker.tsx";
import { Legend } from "./Legend.tsx";

interface InitialSetupProps {
  repoRoot: string;
  onComplete: () => void;
  onExit: () => void;
}

type SettingField = "defaultWorktreePath" | "postCreateCommand" | "filesToCopy" | "enforceBranchConvention" | "branchPrefixes";

const SETTINGS_INFO: Record<SettingField, { label: string; hint: string }> = {
  defaultWorktreePath: {
    label: "Default worktree path",
    hint: "Where new worktrees are created. Use {repo} for repository name and {branch} for branch name.",
  },
  postCreateCommand: {
    label: "Post-create command",
    hint: "Command to run after creating a worktree. Use {path} for the worktree path. Useful for installing dependencies.",
  },
  filesToCopy: {
    label: "Files to copy",
    hint: "Copy these files to new worktrees (comma-separated glob patterns). E.g., .env, .env.local for environment files.",
  },
  enforceBranchConvention: {
    label: "Enforce branch naming convention",
    hint: "When enabled, new branches must start with one of the allowed prefixes below.",
  },
  branchPrefixes: {
    label: "Branch prefixes",
    hint: "Allowed prefixes for new branches (comma-separated). E.g., feature, bugfix, hotfix.",
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

export function InitialSetup({ repoRoot, onComplete, onExit }: InitialSetupProps) {
  const [config, setConfig] = useState<Config>(getDefaultConfig());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showPresetPicker, setShowPresetPicker] = useState(false);

  const activeFields = getActiveFields(config);
  // Total items = fields + Save button
  const totalItems = activeFields.length + 1;
  const isSaveSelected = selectedIndex === activeFields.length;

  // Clamp selectedIndex when activeFields changes
  useEffect(() => {
    if (selectedIndex >= totalItems) {
      setSelectedIndex(totalItems - 1);
    }
  }, [totalItems, selectedIndex]);

  useInput(
    (input, key) => {
      if (editing) {
        if (key.return) {
          const field = activeFields[selectedIndex];
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

      if (input === "q") {
        onExit();
        return;
      }

      if (key.upArrow) {
        setSelectedIndex((i) => (i > 0 ? i - 1 : totalItems - 1));
      } else if (key.downArrow) {
        setSelectedIndex((i) => (i < totalItems - 1 ? i + 1 : 0));
      } else if (key.return) {
        if (isSaveSelected) {
          saveConfig(config, repoRoot).then(() => {
            onComplete();
          });
        } else {
          const field = activeFields[selectedIndex];
          if (field) {
            if (field === "postCreateCommand") {
              setShowPresetPicker(true);
            } else if (field === "enforceBranchConvention") {
              // Toggle boolean field
              setConfig(setFieldValue(config, field, ""));
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

      {activeFields.map((field, i) => {
        const info = SETTINGS_INFO[field];
        const isSelected = i === selectedIndex;
        const isEditing = isSelected && editing;
        const isPresetPickerOpen = isSelected && showPresetPicker && field === "postCreateCommand";
        const isToggle = field === "enforceBranchConvention";
        const currentValue = getFieldValue(config, field);

        return (
          <Box key={field} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={isSelected ? "cyan" : undefined}>
                {isSelected ? "> " : "  "}
                {info.label}:{" "}
              </Text>
              {isPresetPickerOpen ? null : isEditing ? (
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
                  {currentValue || "(not set)"}
                </Text>
              )}
            </Box>
            {isPresetPickerOpen && (
              <Box marginLeft={4}>
                <PresetPicker
                  value={config.postCreateCommand}
                  onChange={handlePresetSelect}
                  onCancel={handlePresetCancel}
                />
              </Box>
            )}
            {!isPresetPickerOpen && (
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
          <Legend
            text={
              editing
                ? "[Enter] Save • [Esc] Cancel"
                : "[Enter] Edit/Select • [↑↓] Navigate • [q] Quit"
            }
          />
        </Box>
      )}
    </Box>
  );
}
