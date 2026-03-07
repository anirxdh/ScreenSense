import { ExtensionState, IconState, MessageType } from '../shared/types';
import { isMicPermissionGranted } from '../shared/storage';
import { captureScreenshot } from './screenshot';

let currentState: ExtensionState = 'idle';
let latestScreenshot: string | undefined;

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
        console.log('[ScreenSense] Shortcut hold detected at', message.cursorX, message.cursorY);
        currentState = 'listening';
        updateToolbarIcon('recording');
        broadcastStateChange(currentState);
        sendResponse({ ok: true, state: currentState });
        break;

      case 'shortcut-release':
        console.log('[ScreenSense] Shortcut release detected at', message.cursorX, message.cursorY);
        currentState = 'processing';
        broadcastStateChange(currentState);
        captureScreenshot()
          .then((dataUrl) => {
            latestScreenshot = dataUrl;
            console.log('[ScreenSense] Screenshot captured, length:', dataUrl?.length);
            // Send screenshot URL back to content script
            if (sender.tab?.id) {
              chrome.tabs.sendMessage(sender.tab.id, {
                action: 'shortcut-release-complete' as const,
                screenshotUrl: dataUrl,
              });
            }
            currentState = 'idle';
            resolveIconState();
            broadcastStateChange(currentState);
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
        // For now, just log it. Phase 2 will send to STT.
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
