import React from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isPending = false,
}) {
  return (
    <Modal open={open} onClose={() => !isPending && onClose?.()} showClose={!isPending}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              isDestructive
                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="pt-0.5">
            <h2 className="text-xl font-bold text-white mb-1.5">{title}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5"
          >
            {cancelText}
          </Button>
          <Button
            variant={isDestructive ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={isPending}
            loadingText="Processing..."
            className="px-5 py-2.5"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
