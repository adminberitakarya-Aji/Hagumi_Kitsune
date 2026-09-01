/** Toast queue (Doc 12 §2.5) — top-center y=88, maks 3 tampil. */
import { useToasts } from "../store/toastStore";

export function Toast() {
  const toasts = useToasts();

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          {toast.text}
        </div>
      ))}
    </div>
  );
}
