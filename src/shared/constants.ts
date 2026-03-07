import { ExtensionSettings } from './types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
  shortcutKey: '`',
  holdDelayMs: 200,
  maxRecordingMs: 60000,
};

export const STORAGE_KEYS = {
  SETTINGS: 'screensense-settings',
  SETUP_COMPLETE: 'screensense-setup-complete',
  MIC_GRANTED: 'screensense-mic-granted',
} as const;
