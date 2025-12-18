import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { loadConfig, saveConfig, type Config } from "../utils/config.ts";

interface SettingsProps {
  onClose: () => void;
}

type SettingField = "defaultWorktreePath" | "postCreateCommand";

const SETTINGS_INFO: Record<SettingField, { label: string; hint: string }> = {
  defaultWorktreePath: {
    label: "Default worktree path",
    hint: "Use {repo} and {branch} as placeholders",
  },
  postCreateCommand: {
    label: "Post-create command",
    hint: "Use {path} as placeholder. Leave empty to disable.",
  },
};

const FIELDS: SettingField[] = ["defaultWorktreePath", "postCreateCommand"];

export function Settings({ onClose }: SettingsProps) {
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedField, setSelectedField] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  useInput((input, key) => {
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
          const newConfig = { ...config, [field]: editValue };
          setConfig(newConfig);
          saveConfig(newConfig).then(() => {
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
        setEditValue(config[field]);
        setEditing(true);
      }
    }
  });

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

        return (
          <Box key={field} flexDirection="column" marginBottom={1}>
            <Box>
              <Text color={isSelected ? "cyan" : undefined}>
                {isSelected ? "> " : "  "}
                {info.label}:
              </Text>
            </Box>
            <Box marginLeft={4}>
              {isEditing ? (
                <Box>
                  <Text color="yellow">{editValue}</Text>
                  <Text color="gray">|</Text>
                </Box>
              ) : (
                <Text dimColor>{config[field] || "(empty)"}</Text>
              )}
            </Box>
            {isSelected && (
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
        <Text dimColor>
          {editing
            ? "[Enter] Save • [Esc] Cancel"
            : "[Enter] Edit • [↑↓] Navigate • [Esc] Back"}
        </Text>
      </Box>
    </Box>
  );
}
