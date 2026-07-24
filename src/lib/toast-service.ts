import type { NotificationType, SplashedPushNotificationsHandle } from "@/components/ui/splashed-push-notifications";

type ToastListener = (type: NotificationType, title: string, content: string) => void;

class ToastManager {
  private listener: ToastListener | null = null;

  register(ref: SplashedPushNotificationsHandle | null) {
    if (!ref) {
      this.listener = null;
      return;
    }
    this.listener = (type, title, content) => {
      ref.createNotification(type, title, content);
    };
  }

  show(type: NotificationType, title: string, content: string) {
    if (this.listener) {
      this.listener(type, title, content);
    } else {
      // Fallback para log ou fila de execução pré-renderização
      setTimeout(() => {
        if (this.listener) this.listener(type, title, content);
      }, 300);
    }
  }

  success(title: string, content: string = "") {
    this.show("success", title, content);
  }

  error(title: string, content: string = "") {
    this.show("error", title, content);
  }

  warning(title: string, content: string = "") {
    this.show("warning", title, content);
  }

  help(title: string, content: string = "") {
    this.show("help", title, content);
  }
}

export const toast = new ToastManager();
