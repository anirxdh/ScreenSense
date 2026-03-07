import { ExtensionSettings } from './types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from './constants';

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const stored = result[STORAGE_KEYS.SETTINGS];
  if (stored) {
    return { ...DEFAULT_SETTINGS, ...stored };
  }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(
  settings: Partial<ExtensionSettings>
): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
}

export async function isSetupComplete(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETUP_COMPLETE);
  return result[STORAGE_KEYS.SETUP_COMPLETE] === true;
}

export async function setSetupComplete(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.SETUP_COMPLETE]: true });
}

export async function isMicPermissionGranted(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.MIC_GRANTED);
  return result[STORAGE_KEYS.MIC_GRANTED] === true;
}

export async function setMicPermissionGranted(
  granted: boolean
): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.MIC_GRANTED]: granted });
}
