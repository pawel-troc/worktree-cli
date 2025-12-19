import React from "react";
import { Text } from "ink";

interface LegendProps {
  text: string;
}

/**
 * Renders a legend/shortcut hint with bracketed keys colored cyan.
 * Example: "[q] Exit • [c] Create" renders with [q] and [c] in cyan.
 */
export function Legend({ text }: LegendProps) {
  // Parse the text and split into parts: bracketed (cyan) and regular (dim)
  const parts: { text: string; isBracket: boolean }[] = [];
  let current = "";
  let inBracket = false;

  for (const char of text) {
    if (char === "[") {
      if (current) {
        parts.push({ text: current, isBracket: false });
        current = "";
      }
      inBracket = true;
      current = "[";
    } else if (char === "]" && inBracket) {
      current += "]";
      parts.push({ text: current, isBracket: true });
      current = "";
      inBracket = false;
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push({ text: current, isBracket: inBracket });
  }

  return (
    <Text>
      {parts.map((part, i) =>
        part.isBracket ? (
          <Text key={i} color="cyan">
            {part.text}
          </Text>
        ) : (
          <Text key={i} dimColor>
            {part.text}
          </Text>
        )
      )}
    </Text>
  );
}
