export interface ExtensionSettings {
  shortcutKey: string; // default: '`'
  holdDelayMs: number; // default: 200
  maxRecordingMs: number; // default: 60000
}

export type ExtensionState = 'idle' | 'listening' | 'processing';

export type IconState = 'inactive' | 'ready' | 'recording';

export interface ShortcutEvent {
  type: 'shortcut-hold' | 'shortcut-release';
  cursorX: number;
  cursorY: number;
}

export type MessageType =
  | { action: 'shortcut-hold'; cursorX: number; cursorY: number }
  | { action: 'shortcut-release'; cursorX: number; cursorY: number }
  | { action: 'capture-screenshot' }
  | { action: 'get-state' }
  | { action: 'state-changed'; state: ExtensionState }
  | { action: 'check-mic-permission' }
  | { action: 'mic-permission-result'; granted: boolean }
  | { action: 'open-welcome' }
  | { action: 'recording-complete'; audioBase64: string; mimeType: string }
  | { action: 'shortcut-release-complete'; screenshotUrl: string };
