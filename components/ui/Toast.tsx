"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type ToastKind = "success" | "error";
type Toast = { id: number; message: string; kind: ToastKind };

type ToastContextValue = {
  /** Muestra un toast de éxito (verde). */
  success: (message: string) => void;
  /** Muestra un toast de error (rojo). */
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message: string, kind: ToastKind) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
  }, []);

  const value: ToastContextValue = {
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Viewport: abajo-centro en mobile, abajo-derecha en desktop */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // animación de entrada
    const enter = requestAnimationFrame(() => setShow(true));
    // auto-cierre a los 3s (salida + remove)
    const hide = setTimeout(() => setShow(false), 3000);
    const kill = setTimeout(onClose, 3300);
    return () => {
      cancelAnimationFrame(enter);
      clearTimeout(hide);
      clearTimeout(kill);
    };
  }, [onClose]);

  const isSuccess = toast.kind === "success";

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-lg border px-4 py-3 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${
        isSuccess
          ? "border-green-800/70 bg-green-950/90 text-green-100"
          : "border-red-800/70 bg-red-950/90 text-red-100"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} className="shrink-0 text-green-400" />
      ) : (
        <AlertTriangle size={18} className="shrink-0 text-red-400" />
      )}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => setShow(false)}
        aria-label="Cerrar"
        className="shrink-0 text-neutral-400 transition-colors hover:text-neutral-100"
      >
        <X size={15} />
      </button>
    </div>
  );
}
