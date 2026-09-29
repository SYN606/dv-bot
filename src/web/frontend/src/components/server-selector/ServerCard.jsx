import React from "react";
import { Link } from "react-router-dom";
import Badge from "../ui/Badge";
import { ShieldAlert, UserCheck, Shield, Crown } from "lucide-react";

export default function ServerCard({ guild, onRequestAccess }) {
  const { access, botPresent } = guild;
  const { canManage, accessLevel } = access;

  const getAvatarUrl = () => {
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=128`;
    }
    return null;
  };

  const getAccessIcon = () => {
    switch(accessLevel) {
      case "Owner": return <Crown className="w-3.5 h-3.5" />;
      case "Administrator": return <Shield className="w-3.5 h-3.5" />;
      case "Manager": return <UserCheck className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getBadgeVariant = () => {
    switch(accessLevel) {
      case "Owner": return "brand";
      case "Administrator": return "warning";
      case "Manager": return "success";
      default: return "default";
    }
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div className="bg-slate-900 border border-white/5 rounded-3xl p-5 flex flex-col h-full hover:border-white/10 transition-colors shadow-sm">
      <div className="flex items-start gap-4 mb-6">
        <div className="shrink-0">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={guild.name} 
              className="w-14 h-14 rounded-2xl bg-slate-800 object-cover border border-white/5"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center font-bold text-lg text-slate-400">
              {guild.name.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white truncate mb-1" title={guild.name}>
            {guild.name}
          </h3>
          <Badge variant={getBadgeVariant()} className="flex items-center gap-1.5 w-fit">
            {getAccessIcon()}
            {accessLevel}
          </Badge>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-4">
          {botPresent ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0"></div>
              <span className="text-xs font-semibold text-emerald-400">Digital Vigital Active</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0"></div>
              <span className="text-xs font-semibold text-slate-400">Bot not added</span>
            </>
          )}
        </div>

        {!canManage && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/5 mb-4 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Manage Server or Administrator permission required to configure this server.
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-white/5">
        {botPresent && canManage && (
          <Link 
            to={`/dashboard/${guild.id}`}
            className="w-full flex justify-center py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors shadow-lg shadow-indigo-600/20"
          >
            Manage Server
          </Link>
        )}
        {!botPresent && canManage && (
          <button
            onClick={() => onRequestAccess(guild)}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-colors border border-white/5"
          >
            Request Bot Access
          </button>
        )}
      </div>
    </div>
  );
}
