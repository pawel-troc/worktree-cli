import type { ReactNode } from "react";

/**
 * Wizard phases
 */
export type WizardPhase = "steps" | "summary" | "editing";

/**
 * Selection option for selection steps
 */
export interface SelectionOption {
  value: string;
  label: string;
  suffix?: string;
  disabled?: boolean;
}

/**
 * Base step properties shared by all step types
 */
interface BaseStep<TData> {
  id: string;
  label: string;
  dataKey: keyof TData;
  validate?: (value: unknown, data: Partial<TData>) => string | null;
  skipIf?: (data: Partial<TData>) => boolean;
  formatValue?: (value: unknown, data?: Partial<TData>) => string;
}

/**
 * Selection step - list of options navigable with up/down arrows
 */
export interface SelectionStep<TData> extends BaseStep<TData> {
  type: "selection";
  prompt: string;
  options: SelectionOption[] | ((data: Partial<TData>) => SelectionOption[]);
  defaultIndex?: number;
}

/**
 * Text input step - free-form text with backspace support
 */
export interface TextInputStep<TData> extends BaseStep<TData> {
  type: "text";
  prompt: string;
  placeholder?: string;
  defaultValue?: string | ((data: Partial<TData>) => string);
  showCursor?: boolean;
}

/**
 * Confirmation option for confirmation steps
 */
export interface ConfirmOption {
  key: string;
  label: string;
  value: unknown;
  color?: string;
}

/**
 * Confirmation step - key-based confirmations (y/n/f)
 */
export interface ConfirmationStep<TData> extends BaseStep<TData> {
  type: "confirmation";
  prompt: string;
  details?: (data: Partial<TData>) => Array<{ label: string; value: string }>;
  warning?: (data: Partial<TData>) => string | null;
  confirmOptions: ConfirmOption[];
}

/**
 * Discriminated union for all step types
 */
export type WizardStep<TData> =
  | SelectionStep<TData>
  | TextInputStep<TData>
  | ConfirmationStep<TData>;

/**
 * Props for summary render function
 */
export interface SummaryRenderProps<TData> {
  data: TData;
  steps: WizardStep<TData>[];
  onEdit: (stepIndex: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  selectedIndex: number;
}

/**
 * Main Wizard props
 */
export interface WizardProps<TData extends Record<string, unknown>> {
  title: string;
  titleColor?: string;
  steps: WizardStep<TData>[];
  initialData?: Partial<TData>;
  onComplete: (data: TData) => void;
  onCancel: () => void;
  renderSummary?: (props: SummaryRenderProps<TData>) => ReactNode;
  showProgress?: boolean;
}

/**
 * Internal wizard state
 */
export interface WizardState<TData> {
  currentStepIndex: number;
  phase: WizardPhase;
  editingStepIndex: number | null;
  data: Partial<TData>;
  error: string | null;
  selectionIndex: number;
  textValue: string;
}
