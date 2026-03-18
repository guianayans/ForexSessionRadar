function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForFontsReady() {
  const docWithFonts = document as Document & { fonts?: FontFaceSet };
  if (!docWithFonts.fonts?.ready) {
    return;
  }

  try {
    await docWithFonts.fonts.ready;
  } catch {
    // Em alguns ambientes o FontFaceSet pode rejeitar. Segue sem bloquear a captura.
  }
}

export async function waitForStableRender(element: HTMLElement) {
  await waitForFontsReady();
  await waitNextFrame();
  await waitNextFrame();
  await wait(80);

  let previous = element.getBoundingClientRect();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await waitNextFrame();
    await wait(50);
    const current = element.getBoundingClientRect();
    const widthDelta = Math.abs(current.width - previous.width);
    const heightDelta = Math.abs(current.height - previous.height);

    if (widthDelta < 0.5 && heightDelta < 0.5) {
      return current;
    }

    previous = current;
  }

  return previous;
}

function applySnapshotMode(cloneDocument: Document, snapshotId: string, width: number, height: number) {
  const target = cloneDocument.querySelector<HTMLElement>(`[data-timeline-snapshot-id="${snapshotId}"]`);
  if (!target) {
    return;
  }

  target.classList.add('timeline-snapshot-mode');
  target.style.width = `${Math.ceil(width)}px`;
  target.style.minWidth = `${Math.ceil(width)}px`;
  target.style.maxWidth = `${Math.ceil(width)}px`;
  target.style.height = `${Math.ceil(height)}px`;
  target.style.overflow = 'hidden';

  const styleTag = cloneDocument.createElement('style');
  styleTag.setAttribute('data-timeline-snapshot-style', 'true');
  styleTag.textContent = `
    .timeline-snapshot-mode,
    .timeline-snapshot-mode * {
      animation: none !important;
      transition: none !important;
      caret-color: transparent !important;
    }

    .timeline-snapshot-mode * {
      text-rendering: geometricPrecision !important;
      -webkit-font-smoothing: antialiased !important;
      font-kerning: normal !important;
    }

    .timeline-snapshot-mode [data-timeline-panel="true"] {
      display: none !important;
    }
  `;
  cloneDocument.head.appendChild(styleTag);
}

function cleanupSnapshotMode(element: HTMLElement) {
  element.removeAttribute('data-timeline-snapshot-id');
}

function estimateDataUrlBytes(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex < 0) {
    return 0;
  }

  const base64 = dataUrl.slice(commaIndex + 1);
  return Math.floor((base64.length * 3) / 4);
}

interface CaptureTimelineSnapshotOptions {
  maxPngBytes?: number;
}

export async function captureTimelineSnapshot(element: HTMLElement, options: CaptureTimelineSnapshotOptions = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Captura de timeline indisponivel neste ambiente.');
  }

  const { default: html2canvas } = await import('html2canvas');
  const stableRect = await waitForStableRender(element);
  const width = Math.ceil(stableRect.width);
  const height = Math.ceil(stableRect.height);

  if (width <= 0 || height <= 0) {
    throw new Error('Elemento da timeline sem dimensao valida para captura.');
  }

  const snapshotId = `timeline-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  element.setAttribute('data-timeline-snapshot-id', snapshotId);

  try {
    const scale = Math.min(2.5, Math.max(2, window.devicePixelRatio || 1));
    const canvas = await html2canvas(element, {
      backgroundColor: '#061326',
      useCORS: true,
      logging: false,
      scale,
      width,
      height,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      windowWidth: Math.max(document.documentElement.clientWidth, width),
      windowHeight: Math.max(document.documentElement.clientHeight, height),
      onclone: (cloneDocument) => {
        applySnapshotMode(cloneDocument, snapshotId, width, height);
      }
    });

    const maxPngBytes = options.maxPngBytes ?? 7_500_000;
    const pngDataUrl = canvas.toDataURL('image/png');
    if (estimateDataUrlBytes(pngDataUrl) <= maxPngBytes) {
      return pngDataUrl;
    }

    return canvas.toDataURL('image/jpeg', 0.95);
  } finally {
    cleanupSnapshotMode(element);
  }
}
