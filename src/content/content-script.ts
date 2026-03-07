import './content.css';
import { initShortcutHandler } from './shortcut-handler';
import { AudioRecorder } from './audio-recorder';
import { ListeningIndicator } from './listening-indicator';
import { getSettings } from '../shared/storage';

const isTopFrame = window === window.top;

// Shortcut handler runs in ALL frames (needed for Google Docs iframes)
initShortcutHandler();

// Everything below only runs in the top frame
if (!isTopFrame) {
  // Stop here for iframes — shortcut handler is enough
} else {

let recorder: AudioRecorder | null = null;
let isRecording = false;
const indicator = new ListeningIndicator();
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;

let lastCursorX = 0;
let lastCursorY = 0;

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

function startCursorTracking(): void {
  mouseMoveHandler = (e: MouseEvent) => {
    lastCursorX = e.clientX;
    lastCursorY = e.clientY;
    indicator.updatePosition(e.clientX, e.clientY);
  };
  document.addEventListener('mousemove', mouseMoveHandler, { passive: true });
}

function stopCursorTracking(): void {
  if (mouseMoveHandler) {
    document.removeEventListener('mousemove', mouseMoveHandler);
    mouseMoveHandler = null;
  }
}

async function handleRelease(): Promise<void> {
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

async function handleAutoStop(): Promise<void> {
  // Hide indicator and stop cursor tracking
  indicator.hide();
  stopCursorTracking();

  // Stop recording and send data
  await handleRelease();

  // Trigger release in background (captures screenshot)
  chrome.runtime.sendMessage({
    action: 'shortcut-release',
    cursorX: lastCursorX,
    cursorY: lastCursorY,
  });

  // Dispatch release event so shortcut-handler resets its state
  document.dispatchEvent(
    new CustomEvent('screensense-release', {
      detail: { cursorX: lastCursorX, cursorY: lastCursorY, autoStop: true },
    })
  );
}

async function onHold(event: Event): Promise<void> {
  const detail = (event as CustomEvent).detail;
  lastCursorX = detail.cursorX;
  lastCursorY = detail.cursorY;

  if (isRecording) return;

  try {
    const settings = await getSettings();
    recorder = new AudioRecorder();
    isRecording = true;

    // Show the waveform indicator
    indicator.show(lastCursorX, lastCursorY);

    // Start cursor tracking for indicator
    startCursorTracking();

    // Start recording with amplitude callback for waveform visualization
    await recorder.start({
      maxDurationMs: settings.maxRecordingMs,
      onAmplitude: (data: Uint8Array) => {
        indicator.updateAmplitude(data);
      },
      onAutoStop: handleAutoStop,
    });

    console.log('[ScreenSense] Recording started');
  } catch (err) {
    console.error('[ScreenSense] Failed to start recording:', err);
    isRecording = false;
    recorder = null;
    indicator.hide();
    stopCursorTracking();
  }
}

async function onRelease(event: Event): Promise<void> {
  const detail = (event as CustomEvent).detail;

  // If this is an auto-stop synthetic release, skip (already handled)
  if (detail?.autoStop) return;

  // Hide the waveform indicator
  indicator.hide();
  stopCursorTracking();

  // Stop recording and send data
  await handleRelease();
}

// Listen for messages from background (e.g., screenshot confirmation)
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'shortcut-release-complete') {
    console.log('[ScreenSense] Screenshot captured, length:', message.screenshotUrl?.length);
  }
});

// Listen for shortcut custom events
document.addEventListener('screensense-hold', onHold);
document.addEventListener('screensense-release', onRelease);

console.log('[ScreenSense] Content script loaded');

} // end isTopFrame
