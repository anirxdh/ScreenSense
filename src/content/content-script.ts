import './content.css';
import { initShortcutHandler } from './shortcut-handler';
import { AudioRecorder } from './audio-recorder';
import { getSettings } from '../shared/storage';

let recorder: AudioRecorder | null = null;
let isRecording = false;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function handleAutoStop(): Promise<void> {
  // Auto-stop mimics the natural release flow
  if (!recorder || !isRecording) return;

  try {
    const audioBlob = await recorder.stop();
    isRecording = false;

    const audioBase64 = await blobToBase64(audioBlob);

    // Send recording data to background
    chrome.runtime.sendMessage({
      action: 'recording-complete',
      audioBase64,
      mimeType: audioBlob.type,
    });

    // Trigger release in background (captures screenshot)
    const cursorX = lastCursorX;
    const cursorY = lastCursorY;
    chrome.runtime.sendMessage({
      action: 'shortcut-release',
      cursorX,
      cursorY,
    });

    // Dispatch release event for UI cleanup
    document.dispatchEvent(
      new CustomEvent('screensense-release', {
        detail: { cursorX, cursorY },
      })
    );
  } catch (err) {
    console.error('[ScreenSense] Auto-stop error:', err);
    isRecording = false;
  }

  recorder = null;
}

let lastCursorX = 0;
let lastCursorY = 0;

async function onHold(event: Event): Promise<void> {
  const detail = (event as CustomEvent).detail;
  lastCursorX = detail.cursorX;
  lastCursorY = detail.cursorY;

  if (isRecording) return;

  try {
    const settings = await getSettings();
    recorder = new AudioRecorder();
    isRecording = true;

    await recorder.start({
      maxDurationMs: settings.maxRecordingMs,
      onAutoStop: handleAutoStop,
    });

    console.log('[ScreenSense] Recording started');
  } catch (err) {
    console.error('[ScreenSense] Failed to start recording:', err);
    isRecording = false;
    recorder = null;
  }
}

async function onRelease(_event: Event): Promise<void> {
  if (!recorder || !isRecording) return;

  try {
    const audioBlob = await recorder.stop();
    isRecording = false;

    console.log('[ScreenSense] Recording stopped, blob size:', audioBlob.size);

    const audioBase64 = await blobToBase64(audioBlob);

    // Send recording data to background
    chrome.runtime.sendMessage({
      action: 'recording-complete',
      audioBase64,
      mimeType: audioBlob.type,
    });
  } catch (err) {
    console.error('[ScreenSense] Failed to stop recording:', err);
    isRecording = false;
  }

  recorder = null;
}

// Listen for shortcut custom events
document.addEventListener('screensense-hold', onHold);
document.addEventListener('screensense-release', onRelease);

// Initialize shortcut detection
initShortcutHandler();

console.log('[ScreenSense] Content script loaded');
