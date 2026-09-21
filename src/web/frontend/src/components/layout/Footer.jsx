import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-6 text-xs text-slate-400 font-sans mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-1.5 justify-center sm:justify-start">
          <span>Powered by</span>
          <a
            href="https://digitalvigital.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Digital vigital Network
          </a>
        </div>
        <div className="flex items-center gap-1.5 justify-center sm:justify-end text-slate-400 text-xs">
          <span>Developed by</span>
          <a
            href="https://syn606.wtf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-200 hover:text-indigo-400 transition-colors"
          >
            SYN 606 | cybermind Networks
          </a>
        </div>
      </div>
    </footer>
  );
}
