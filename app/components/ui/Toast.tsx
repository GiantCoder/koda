"use client";

import React, { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  message: ToastMessage;
  onClose: (id: string) => void;
}

function Toast({ message, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = message.duration ?? 3000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(message.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message.id, message.duration, onClose]);

  const bgColor = {
    success: "bg-[var(--success)]",
    error: "bg-[var(--danger)]",
    info: "bg-[var(--primary)]",
    warning: "bg-[var(--warning)]",
  }[message.type];

  const icon = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  }[message.type];

  return (
    <div
      className={`${bgColor} flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg transition-all duration-300 ${
        isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"
      }`}
      role="alert"
    >
      <span className="text-lg font-bold">{icon}</span>
      <span className="text-sm font-medium">{message.message}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(message.id), 300);
        }}
        className="ml-2 text-white/80 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast message={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
