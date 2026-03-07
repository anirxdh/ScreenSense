# ScreenSense Voice

## What This Is

A voice-first AI overlay Chrome extension that lets users press-and-hold a keyboard shortcut, speak a question about what's on their screen, and get a concise AI-generated explanation displayed near the cursor — optionally read aloud. Built for TreeLine Hacks 2026 as a solo hackathon project.

## Core Value

A user can hold a shortcut, ask a spoken question about anything visible on their screen, and receive an immediate, contextual answer without leaving the page.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Hold-to-speak keyboard shortcut invocation with press/hold/release detection
- [ ] Microphone capture only while shortcut is held
- [ ] Minimal floating listening UI near cursor during recording
- [ ] Screenshot capture of active browser tab on shortcut release
- [ ] ElevenLabs Speech-to-Text transcription of recorded audio
- [ ] Gemini multimodal LLM analysis of screenshot + transcribed query
- [ ] Cursor-based overlay tooltip displaying the AI explanation
- [ ] Optional ElevenLabs Text-to-Speech playback of the response
- [ ] Typed fallback mode when voice capture or transcription fails
- [ ] Demo mode with cached mock responses for reliable hackathon presentation
- [ ] Quick dismiss of the overlay
- [ ] Smooth browsing experience — no page navigation forced

### Out of Scope

- Desktop-level OS integration — Chrome extension only for hackathon
- Native mobile app — web-first
- Persistent chat history or long-term memory — single-shot Q&A only
- Multi-user collaboration — solo user tool
- Fine-tuned custom models — using off-the-shelf APIs
- Production auth, billing, enterprise security — hackathon prototype
- Continuous background audio capture — only records during shortcut hold
- Backend server — all API calls made directly from extension

## Context

- **Hackathon**: TreeLine Hacks 2026, 36-hour build window
- **Solo build**: One developer building with Claude Code assistance
- **Target prize**: Best Project Built with ElevenLabs
- **Key use cases**: YouTube explainers, Reddit thread summaries, code/error debugging, research paper simplification, general on-screen help
- **Interaction model**: Press-speak-release — designed to feel like an AI-native browser layer, not a static tool

## Constraints

- **Budget**: Free — Gemini free tier for vision, ElevenLabs plan for voice
- **Timeline**: 36-hour hackathon window
- **Platform**: Chrome Extension Manifest V3 only
- **Tech stack**: React + TypeScript, Tailwind CSS, Chrome Extension APIs
- **No server**: All API calls from extension directly (Gemini API, ElevenLabs API)
- **Audio**: MediaRecorder / getUserMedia for mic capture, chrome.tabs.captureVisibleTab for screenshots

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Gemini for vision LLM | Free tier available, strong multimodal capabilities | — Pending |
| ElevenLabs for STT + TTS | Hackathon prize target, quality voice I/O | — Pending |
| No backend server | Simplest architecture, fastest to build solo | — Pending |
| Chrome Extension MV3 | Standard modern extension platform, good APIs for screenshots | — Pending |
| React + TypeScript + Tailwind | Fast UI development, type safety | — Pending |

---
*Last updated: 2026-03-07 after initialization*
