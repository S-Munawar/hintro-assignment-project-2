"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, duration = 3000, onClose }: ToastProps) {

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div>
      <span>{message}</span>
      <button onClick={() => { onClose(); }} type="button">
        <X size={16} />
      </button>
    </div>
  );
}
