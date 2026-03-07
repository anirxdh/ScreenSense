import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings } from '../shared/storage';
import { DEFAULT_SETTINGS } from '../shared/constants';
import { ExtensionSettings } from '../shared/types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleKeyCapture = (e: React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (settings) {
      setSettings({ ...settings, shortcutKey: e.key });
      setCapturing(false);
    }
  };

  const handleSave = async () => {
    if (settings) {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = async () => {
    setSettings({ ...DEFAULT_SETTINGS });
    await saveSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const displayKey = settings.shortcutKey === '`' ? 'Backtick (`)' : settings.shortcutKey;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

        {/* Shortcut Key */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Shortcut Key
          </label>
          {capturing ? (
            <div
              className="w-full px-4 py-3 bg-blue-900/50 border-2 border-blue-500 rounded-lg text-blue-300 text-center cursor-pointer focus:outline-none"
              tabIndex={0}
              onKeyDown={handleKeyCapture}
              onBlur={() => setCapturing(false)}
              autoFocus
              ref={(el) => el?.focus()}
            >
              Press any key...
            </div>
          ) : (
            <button
              onClick={() => setCapturing(true)}
              className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white text-center transition-colors"
            >
              <span className="font-mono">{displayKey}</span>
              <span className="text-gray-400 text-sm ml-2">
                (click to change)
              </span>
            </button>
          )}
        </div>

        {/* Hold Delay */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Hold Delay: {settings.holdDelayMs}ms
          </label>
          <input
            type="range"
            min={100}
            max={500}
            step={10}
            value={settings.holdDelayMs}
            onChange={(e) =>
              setSettings({
                ...settings,
                holdDelayMs: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>100ms</span>
            <span>500ms</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={handleReset}
            className="py-3 px-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
