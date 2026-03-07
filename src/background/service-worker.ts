import { ExtensionState, IconState, MessageType } from '../shared/types';
import { isMicPermissionGranted, getApiKeys } from '../shared/storage';
import { captureScreenshot } from './screenshot';
import { transcribeAudio } from './api/elevenlabs-stt';
import { streamGeminiResponse } from './api/gemini';

let currentState: ExtensionState = 'idle';
let latestScreenshot: string | undefined;
let pendingAudio: { audioBase64: string; mimeType: string } | null = null;
let pendingTabId: number | null = null;

function openWelcomeTab(): void {
  const welcomeUrl = chrome.runtime.getURL('welcome.html');
  chrome.tabs.create({ url: welcomeUrl });
}

function updateToolbarIcon(iconState: IconState): void {
  switch (iconState) {
    case 'inactive':
      chrome.action.setBadgeText({ text: '' });
      break;
    case 'ready':
      chrome.action.setBadgeText({ text: 'OK' });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      break;
    case 'recording':
      chrome.action.setBadgeText({ text: 'REC' });
      chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
      break;
  }
}

async function resolveIconState(): Promise<void> {
  if (currentState === 'listening') {
    updateToolbarIcon('recording');
  } else {
    const micGranted = await isMicPermissionGranted();
    updateToolbarIcon(micGranted ? 'ready' : 'inactive');
  }
}

function sendToTab(tabId: number, message: MessageType): void {
  chrome.tabs.sendMessage(tabId, message);
}

async function runPipeline(tabId: number | null): Promise<void> {
  if (!pendingAudio || !latestScreenshot || !tabId) return;

  // Grab local refs and clear pending vars to prevent re-entry
  const audio = pendingAudio;
  const screenshot = latestScreenshot;
  pendingAudio = null;
  latestScreenshot = undefined;
  pendingTabId = null;

  try {
    // Check API keys
    const keys = await getApiKeys();
    if (!keys.elevenlabsKey || !keys.geminiKey) {
      sendToTab(tabId, {
        action: 'pipeline-error',
        error:
          'API keys not configured. Open ScreenSense settings to add your ElevenLabs and Gemini API keys.',
      });
      currentState = 'idle';
      resolveIconState();
      broadcastStateChange('idle');
      return;
    }

    // Stage 1: Transcribe audio
    sendToTab(tabId, { action: 'pipeline-stage', stage: 'transcribing' });

    let transcript: string;
    try {
      transcript = await transcribeAudio(
        audio.audioBase64,
        audio.mimeType,
        keys.elevenlabsKey
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      sendToTab(tabId, { action: 'pipeline-error', error: msg });
      currentState = 'idle';
      resolveIconState();
      broadcastStateChange('idle');
      return;
    }

    sendToTab(tabId, {
      action: 'pipeline-stage',
      stage: 'thinking',
      transcript,
    });

    // Stage 2: Gemini streaming response
    sendToTab(tabId, { action: 'pipeline-stage', stage: 'streaming' });

    let fullText: string;
    try {
      fullText = await streamGeminiResponse(
        screenshot,
        transcript,
        keys.geminiKey,
        (chunk: string) => {
          sendToTab(tabId, { action: 'stream-chunk', text: chunk });
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI response failed';
      sendToTab(tabId, { action: 'pipeline-error', error: msg });
      currentState = 'idle';
      resolveIconState();
      broadcastStateChange('idle');
      return;
    }

    // Stream complete
    sendToTab(tabId, { action: 'stream-complete', fullText });
    sendToTab(tabId, { action: 'pipeline-stage', stage: 'complete' });
  } catch (err) {
    console.error('[ScreenSense] Pipeline error:', err);
    sendToTab(tabId, {
      action: 'pipeline-error',
      error: 'Something went wrong. Please try again.',
    });
  } finally {
    currentState = 'idle';
    resolveIconState();
    broadcastStateChange('idle');
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    openWelcomeTab();
  }
  // Set initial icon state
  resolveIconState();
});

// Update icon when storage changes (e.g., mic permission granted)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['screensense-mic-granted']) {
    resolveIconState();
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: MessageType,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    switch (message.action) {
      case 'shortcut-hold':
        console.log(
          '[ScreenSense] Shortcut hold detected at',
          message.cursorX,
          message.cursorY
        );
        currentState = 'listening';
        updateToolbarIcon('recording');
        broadcastStateChange(currentState);
        sendResponse({ ok: true, state: currentState });
        break;

      case 'shortcut-release':
        console.log(
          '[ScreenSense] Shortcut release detected at',
          message.cursorX,
          message.cursorY
        );
        currentState = 'processing';
        broadcastStateChange(currentState);
        captureScreenshot()
          .then((dataUrl) => {
            latestScreenshot = dataUrl;
            console.log(
              '[ScreenSense] Screenshot captured, length:',
              dataUrl?.length
            );
            // Send screenshot URL back to content script
            if (sender.tab?.id) {
              sendToTab(sender.tab.id, {
                action: 'shortcut-release-complete',
                screenshotUrl: dataUrl,
              });
            }
            // Check if audio is also ready; if so, run pipeline
            if (pendingAudio) {
              runPipeline(sender.tab?.id ?? pendingTabId);
            }
          })
          .catch((err) => {
            console.error('[ScreenSense] Screenshot capture failed:', err);
            currentState = 'idle';
            resolveIconState();
            broadcastStateChange(currentState);
          });
        sendResponse({ ok: true, state: currentState });
        return true; // async response

      case 'capture-screenshot':
        captureScreenshot().then((dataUrl) => {
          sendResponse({ ok: true, dataUrl });
        });
        return true; // async response

      case 'recording-complete':
        console.log(
          '[ScreenSense] Recording complete, audio base64 length:',
          message.audioBase64?.length,
          'mime:',
          message.mimeType
        );
        // Store audio data and wait for screenshot
        pendingAudio = {
          audioBase64: message.audioBase64,
          mimeType: message.mimeType,
        };
        pendingTabId = sender.tab?.id ?? null;
        // Check if screenshot is also ready; if so, run pipeline
        if (latestScreenshot) {
          runPipeline(pendingTabId);
        }
        sendResponse({ ok: true });
        break;

      case 'get-state':
        sendResponse({ ok: true, state: currentState });
        break;

      case 'open-welcome':
        openWelcomeTab();
        sendResponse({ ok: true });
        break;

      case 'check-mic-permission':
        // Forward mic permission check to the active content script
        sendResponse({ ok: true });
        break;

      default:
        sendResponse({ ok: false, error: 'Unknown action' });
    }

    return false;
  }
);

function broadcastStateChange(state: ExtensionState): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'state-changed' as const,
        state,
      });
    }
  });
}
