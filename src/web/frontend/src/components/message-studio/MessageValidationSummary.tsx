import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function MessageValidationSummary({ errors = [] }) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1.5 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 font-bold text-rose-400">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Discord API Validation Warning(s)</span>
      </div>
      <ul className="list-disc list-inside space-y-1 pl-1 text-[11.5px] leading-relaxed">
        {errors.map((err, idx) => (
          <li key={idx}>{err}</li>
        ))}
      </ul>
    </div>
  );
}
