import React, { useEffect, useState } from 'react';
import {
  getSettings,
  saveSettings,
  getApiKeys,
  saveApiKeys,
} from '../shared/storage';
import { DEFAULT_SETTINGS } from '../shared/constants';
import { ExtensionSettings } from '../shared/types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
    getApiKeys().then((keys) => {
      setElevenlabsKey(keys.elevenlabsKey || '');
      setGeminiKey(keys.geminiKey || '');
    });
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
      await saveApiKeys({
        elevenlabsKey: elevenlabsKey || undefined,
        geminiKey: geminiKey || undefined,
      });
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

  const displayKey =
    settings.shortcutKey === '`' ? 'Backtick (`)' : settings.shortcutKey;

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

        {/* API Keys Section */}
        <div className="mb-6 pt-4 border-t border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">API Keys</h2>

          {/* ElevenLabs API Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ElevenLabs API Key
            </label>
            <input
              type="password"
              value={elevenlabsKey}
              onChange={(e) => setElevenlabsKey(e.target.value)}
              placeholder="Enter your ElevenLabs API key"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your key from{' '}
              <a
                href="https://elevenlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                elevenlabs.io
              </a>
            </p>
          </div>

          {/* Gemini API Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your key from{' '}
              <a
                href="https://aistudio.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                aistudio.google.com
              </a>
            </p>
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
