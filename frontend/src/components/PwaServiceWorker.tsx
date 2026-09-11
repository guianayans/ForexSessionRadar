import { useEffect } from 'react';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_IPC__' in window;
}

/** Registra o SW só no navegador — o app desktop (Tauri) já tem o próprio shell, não precisa disso. */
export function PwaServiceWorker() {
  useEffect(() => {
    if (isTauriRuntime()) return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ambiente sem suporte (ex.: navegador privado restrito) — só não instala.
    });
  }, []);

  return null;
}
