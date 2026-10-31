import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, type LucideIcon } from "lucide-react";
import StatusBadge from "./StatusBadge";

export interface ModuleCardProps {
  title: string;
  path: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  active?: boolean;
  statusText?: string;
  description?: string;
  className?: string;
}

export default function ModuleCard({
  title,
  path,
  icon: Icon,
  active,
  statusText,
  description,
  className = "",
}: ModuleCardProps) {
  return (
    <Link
      to={path}
      className={`glass-card p-5 rounded-2xl group flex flex-col justify-between min-h-35 hover:border-indigo-500/40 transition-all duration-200 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 group-hover:shadow-md group-hover:shadow-indigo-600/30 transition-all duration-200">
          <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
        </div>
        <StatusBadge active={active} label={statusText} />
      </div>

      <div>
        <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors font-sans">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{description}</p>
        ) : (
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>CONFIGURE</span>
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </div>
    </Link>
  );
}
