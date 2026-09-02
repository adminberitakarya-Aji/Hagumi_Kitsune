/**
 * WebNotifier (M5 — notifikasi lokal, Doc 11/GDD §11): adapter INotifier via
 * Notification API. No-op bila izin belum diberikan / tidak didukung (tab aktif
 * tetap mendapat toasts dari UI — notifikasi hanya penting saat tab di latar).
 */
import type { INotifier } from "@hagumi/core";

export class WebNotifier implements INotifier {
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Minta izin — dipanggil dari interaksi pengguna (bukan otomatis). */
  async requestPermission(): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  notify(title: string, body: string): void {
    if (!this.enabled || typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    // Jangan berisik saat tab terlihat — toasts sudah cukup di foreground
    if (document.visibilityState === "visible") return;
    try {
      new Notification(title, { body, icon: "/icon.svg", tag: "hagumi-pet" });
    } catch {
      /* Notification constructor bisa gagal di beberapa konteks — abaikan */
    }
  }
}

export const webNotifier = new WebNotifier();
