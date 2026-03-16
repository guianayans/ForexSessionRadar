export async function ensureEmbeddedBackend(): Promise<void> {
  // No build de producao, o sidecar e iniciado no processo Rust (src-tauri/src/main.rs).
  // Aqui apenas aguardamos a disponibilidade do backend local.
  if (import.meta.env.DEV) {
    return;
  }

  const isTauriRuntime = typeof window !== 'undefined' && '__TAURI_IPC__' in window;
  const healthUrl = isTauriRuntime ? 'http://127.0.0.1:4783/api/health' : '/api/health';

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Backend ainda inicializando.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error('Backend local indisponivel. Reinicie o app para tentar novamente.');
}
