"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface NotificationToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  onClose: (id: string) => void;
}

const toastStyles: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-900",
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  },
  error: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-900",
    icon: <XCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-900",
    icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
  },
};

export const NotificationToast: React.FC<NotificationToastProps> = ({
  id,
  type,
  title,
  message,
  onClose,
}) => {
  const style = toastStyles[type] || toastStyles.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${style.bg} ${style.border} shadow-modern transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-top-2`}
    >
      {style.icon}
      <div className="flex-1 pr-2">
        <h4 className={`text-sm font-semibold ${style.text}`}>{title}</h4>
        {message && <p className="text-xs text-slate-600 mt-0.5">{message}</p>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-black/5"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationToast;
