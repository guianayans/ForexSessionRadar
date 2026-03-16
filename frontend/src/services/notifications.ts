function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_IPC__' in window;
}

export async function ensureNotificationPermission() {
  if (isTauriRuntime()) {
    const notificationApi = await import('@tauri-apps/api/notification');
    const granted = await notificationApi.isPermissionGranted();
    if (granted) {
      return true;
    }
    const permission = await notificationApi.requestPermission();
    return permission === 'granted';
  }

  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function sendSystemNotification(title: string, body: string) {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    return;
  }

  if (isTauriRuntime()) {
    const notificationApi = await import('@tauri-apps/api/notification');
    notificationApi.sendNotification({
      title,
      body
    });
    return;
  }

  new Notification(title, { body });
}
