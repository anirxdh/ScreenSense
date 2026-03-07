import { ExtensionState, MessageType } from '../shared/types';

let currentState: ExtensionState = 'idle';
let lastScreenshotDataUrl: string | undefined;

function openWelcomeTab(): void {
  const welcomeUrl = chrome.runtime.getURL('welcome.html');
  chrome.tabs.create({ url: welcomeUrl });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    openWelcomeTab();
  }
});

chrome.runtime.onMessage.addListener(
  (
    message: MessageType,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    switch (message.action) {
      case 'shortcut-hold':
        console.log('[ScreenSense] Shortcut hold detected at', message.cursorX, message.cursorY);
        currentState = 'listening';
        broadcastStateChange(currentState);
        sendResponse({ ok: true, state: currentState });
        break;

      case 'shortcut-release':
        console.log('[ScreenSense] Shortcut release detected at', message.cursorX, message.cursorY);
        currentState = 'processing';
        broadcastStateChange(currentState);
        captureScreenshot().then((dataUrl) => {
          lastScreenshotDataUrl = dataUrl;
          console.log('[ScreenSense] Screenshot captured, length:', dataUrl?.length);
          currentState = 'idle';
          broadcastStateChange(currentState);
        });
        sendResponse({ ok: true, state: currentState });
        break;

      case 'capture-screenshot':
        captureScreenshot().then((dataUrl) => {
          sendResponse({ ok: true, dataUrl });
        });
        return true; // async response

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

async function captureScreenshot(): Promise<string | undefined> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(
      undefined as unknown as number,
      { format: 'png' }
    );
    return dataUrl;
  } catch (err) {
    console.error('[ScreenSense] Screenshot capture failed:', err);
    return undefined;
  }
}

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
