const GROQ_STT_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

/**
 * Transcribe audio using Groq Whisper API (free tier).
 * Drop-in replacement for ElevenLabs STT — same signature.
 */
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const audioBlob = new Blob([bytes], { type: mimeType });

  const ext = mimeType.includes('webm')
    ? 'webm'
    : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('mp4')
        ? 'mp4'
        : 'webm';

  const formData = new FormData();
  formData.append('file', audioBlob, `recording.${ext}`);
  formData.append('model', 'whisper-large-v3-turbo');

  const response = await fetch(GROQ_STT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Check your API key in Settings');
    }
    throw new Error("Couldn't catch that — try holding a bit longer");
  }

  const data = await response.json();
  return data.text;
}
