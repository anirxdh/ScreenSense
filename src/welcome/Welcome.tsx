import React, { useState, useEffect } from 'react';
import { getSettings } from '../shared/storage';
import { setMicPermissionGranted, setSetupComplete } from '../shared/storage';
import { ExtensionSettings } from '../shared/types';

type WelcomeStep = 1 | 2 | 3;

const Welcome: React.FC = () => {
  const [step, setStep] = useState<WelcomeStep>(1);
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [micGranted, setMicGranted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleRequestMic = async () => {
    setRequesting(true);
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately -- we just needed the permission
      stream.getTracks().forEach((t) => t.stop());
      setMicGranted(true);
      await setMicPermissionGranted(true);
    } catch (err) {
      setMicError(
        'Microphone access was denied. Please allow microphone access to use ScreenSense Voice.'
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleFinish = async () => {
    await setSetupComplete();
    window.close();
  };

  const shortcutDisplay = settings?.shortcutKey === '`' ? 'Backtick (`)' : settings?.shortcutKey ?? '`';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s === step
                    ? 'bg-blue-500 text-white'
                    : s < step
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-400'
                }`}
              >
                {s < step ? '\u2713' : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    s < step ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          {step === 1 && (
            <>
              <div className="text-5xl mb-4">
                <span role="img" aria-label="keyboard">
                  {'\u2328\uFE0F'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">
                Hold Your Shortcut Key
              </h1>
              <p className="text-gray-300 mb-6">
                Press and hold <span className="font-mono bg-gray-700 px-2 py-1 rounded text-blue-300">{shortcutDisplay}</span> to
                start speaking your question. Release when you're done.
              </p>
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400">
                  Hold for 200ms to activate -- quick taps are ignored so you can still type normally.
                </p>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-5xl mb-4">
                <span role="img" aria-label="microphone">
                  {'\uD83C\uDF99\uFE0F'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">
                Allow Microphone Access
              </h1>
              <p className="text-gray-300 mb-6">
                ScreenSense needs your microphone to hear your questions. Audio
                is only captured while you hold the shortcut key.
              </p>
              {micError && (
                <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3 mb-4">
                  <p className="text-red-300 text-sm">{micError}</p>
                </div>
              )}
              {micGranted ? (
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 bg-green-900/50 border border-green-500/50 rounded-lg px-4 py-2">
                    <span className="text-green-400 text-lg">{'\u2713'}</span>
                    <span className="text-green-300">
                      Microphone access granted
                    </span>
                  </div>
                </div>
              ) : null}
              <div className="flex gap-3">
                {!micGranted && (
                  <button
                    onClick={handleRequestMic}
                    disabled={requesting}
                    className="flex-1 py-3 px-6 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    {requesting ? 'Requesting...' : 'Grant Permission'}
                  </button>
                )}
                <button
                  onClick={() => setStep(3)}
                  disabled={!micGranted}
                  className="flex-1 py-3 px-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-5xl mb-4">
                <span role="img" aria-label="rocket">
                  {'\uD83D\uDE80'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">
                You're All Set!
              </h1>
              <p className="text-gray-300 mb-6">
                Hold <span className="font-mono bg-gray-700 px-2 py-1 rounded text-blue-300">{shortcutDisplay}</span>,
                ask a question about anything on your screen, and get an instant
                answer.
              </p>
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-300 font-medium mb-2">
                  Quick summary:
                </p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>
                    {'\u2022'} Hold <span className="font-mono text-blue-300">{shortcutDisplay}</span> to start speaking
                  </li>
                  <li>{'\u2022'} Release to get your answer</li>
                  <li>{'\u2022'} Works on any webpage</li>
                </ul>
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Start Using ScreenSense
              </button>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          ScreenSense Voice -- TreeLine Hacks 2026
        </p>
      </div>
    </div>
  );
};

export default Welcome;
