import { renderMarkdown } from './markdown';

// Inline styles for Shadow DOM isolation (same pattern as listening-indicator.ts)
const OVERLAY_STYLES = `
.screensense-overlay {
  position: fixed;
  z-index: 2147483647;
  width: 420px;
  max-height: 300px;
  overflow-y: auto;
  padding: 16px 20px;
  border-radius: 16px;
  background: rgba(30, 30, 30, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  pointer-events: auto;
  user-select: text;
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.screensense-overlay.visible {
  opacity: 1;
  transform: scale(1);
}

.screensense-overlay.fade-out {
  opacity: 0;
  transform: scale(0.95);
}

.screensense-stage {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.screensense-stage::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  animation: screensense-pulse 1.2s ease-in-out infinite;
}

.screensense-transcript {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 12px;
  font-style: italic;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
  display: none;
}

.screensense-transcript.visible {
  display: block;
}

.screensense-response {
  /* Inherits overlay font */
}

.screensense-response strong {
  font-weight: 600;
  color: rgba(255, 255, 255, 1);
}

.screensense-response code {
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 13px;
}

.screensense-response ul {
  margin: 4px 0;
  padding-left: 18px;
}

.screensense-response li {
  margin: 2px 0;
}

.screensense-error {
  color: rgba(255, 120, 120, 0.9);
  font-size: 13px;
}

.screensense-overlay::-webkit-scrollbar {
  width: 4px;
}

.screensense-overlay::-webkit-scrollbar-track {
  background: transparent;
}

.screensense-overlay::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.screensense-overlay::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

@keyframes screensense-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
`;

const STAGE_LABELS: Record<string, string> = {
  transcribing: 'Transcribing...',
  thinking: 'Thinking...',
};

export class Overlay {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private overlayEl: HTMLDivElement | null = null;
  private stageEl: HTMLDivElement | null = null;
  private transcriptEl: HTMLDivElement | null = null;
  private responseEl: HTMLDivElement | null = null;
  private visible = false;
  private accumulatedText = '';
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;
  private autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

  show(cursorX: number, cursorY: number): void {
    // Re-invocation: dismiss old overlay first
    if (this.visible) {
      this.dismissImmediate();
    }

    // Create host container
    this.container = document.createElement('div');
    this.container.id = 'screensense-overlay-host';
    this.container.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';

    // Attach closed Shadow DOM
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = OVERLAY_STYLES;
    this.shadowRoot.appendChild(styleEl);

    // Create overlay card
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'screensense-overlay';

    // Position: near cursor with edge detection
    this.positionOverlay(cursorX, cursorY);

    // Stage label
    this.stageEl = document.createElement('div');
    this.stageEl.className = 'screensense-stage';
    this.stageEl.textContent = '';
    this.overlayEl.appendChild(this.stageEl);

    // Transcript (hidden initially)
    this.transcriptEl = document.createElement('div');
    this.transcriptEl.className = 'screensense-transcript';
    this.overlayEl.appendChild(this.transcriptEl);

    // Response area
    this.responseEl = document.createElement('div');
    this.responseEl.className = 'screensense-response';
    this.overlayEl.appendChild(this.responseEl);

    this.shadowRoot.appendChild(this.overlayEl);
    document.body.appendChild(this.container);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      if (this.overlayEl) {
        this.overlayEl.classList.add('visible');
      }
    });

    // Escape key listener (capture phase so it fires before page handlers)
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.dismiss();
      }
    };
    document.addEventListener('keydown', this.escapeHandler, true);

    this.visible = true;
  }

  updateStage(stage: string, transcript?: string): void {
    if (!this.stageEl) return;

    const label = STAGE_LABELS[stage];
    if (label) {
      this.stageEl.textContent = label;
      this.stageEl.style.display = 'flex';
    } else {
      // Clear stage label on streaming/complete
      this.stageEl.style.display = 'none';
      this.stageEl.textContent = '';
    }

    // Show transcript if provided
    if (transcript && this.transcriptEl) {
      this.transcriptEl.textContent = `"${transcript}"`;
      this.transcriptEl.classList.add('visible');
    }
  }

  appendChunk(text: string): void {
    if (!this.responseEl) return;

    this.accumulatedText += text;
    this.responseEl.innerHTML = renderMarkdown(this.accumulatedText);

    // Auto-scroll to bottom if user hasn't scrolled up
    if (this.overlayEl) {
      const el = this.overlayEl;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }

  showError(error: string): void {
    // Clear stage
    if (this.stageEl) {
      this.stageEl.style.display = 'none';
    }

    // Show error in response area
    if (this.responseEl) {
      this.responseEl.innerHTML = '';
    }

    const errorEl = document.createElement('div');
    errorEl.className = 'screensense-error';
    errorEl.textContent = error;

    if (this.overlayEl) {
      this.overlayEl.appendChild(errorEl);
    }

    // Auto-dismiss after 5 seconds
    this.autoDismissTimer = setTimeout(() => {
      this.dismiss();
    }, 5000);
  }

  dismiss(): void {
    if (!this.visible || !this.overlayEl) {
      this.cleanup();
      return;
    }

    // Fade-out animation
    this.overlayEl.classList.add('fade-out');
    this.overlayEl.classList.remove('visible');

    // Remove after transition
    setTimeout(() => {
      this.cleanup();
    }, 180);

    this.visible = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Dismiss immediately without animation (for re-invocation) */
  private dismissImmediate(): void {
    this.cleanup();
    this.visible = false;
  }

  private cleanup(): void {
    // Remove escape listener
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler, true);
      this.escapeHandler = null;
    }

    // Clear auto-dismiss timer
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }

    // Remove from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.shadowRoot = null;
    this.overlayEl = null;
    this.stageEl = null;
    this.transcriptEl = null;
    this.responseEl = null;
    this.accumulatedText = '';
  }

  private positionOverlay(cursorX: number, cursorY: number): void {
    if (!this.overlayEl) return;

    const overlayWidth = 420;
    const overlayMaxHeight = 300;
    const offset = 20;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal positioning
    let left: string;
    let translateX = '';
    if (cursorX < overlayWidth / 2 + 10) {
      // Near left edge: align left
      left = `${Math.max(10, cursorX)}px`;
    } else if (cursorX > vw - overlayWidth / 2 - 10) {
      // Near right edge: align right
      left = `${Math.min(vw - 10, cursorX)}px`;
      translateX = 'translateX(-100%)';
    } else {
      // Center on cursor
      left = `${cursorX}px`;
      translateX = 'translateX(-50%)';
    }

    // Vertical positioning
    let top: string;
    let translateY = '';
    if (cursorY + offset + overlayMaxHeight > vh) {
      // Near bottom: position above cursor
      top = `${cursorY - offset}px`;
      translateY = 'translateY(-100%)';
    } else {
      // Below cursor
      top = `${cursorY + offset}px`;
    }

    const transform = [translateX, translateY].filter(Boolean).join(' ') || 'none';
    this.overlayEl.style.left = left;
    this.overlayEl.style.top = top;
    this.overlayEl.style.transform = transform;
  }
}
