export async function captureScreenshot(): Promise<string> {
  const dataUrl = await chrome.tabs.captureVisibleTab(
    undefined as unknown as number,
    { format: 'png' }
  );
  return dataUrl;
}
