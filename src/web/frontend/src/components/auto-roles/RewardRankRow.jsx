import React from "react";
import { RoleSelector } from "../discord";

export default function RewardRankRow({ rank, roles, value, onChange, excludeIds }) {
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const labels = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };

  // Filter out globally excluded roles from this selector to prevent dupes
  const filteredRoles = roles.filter(r => !excludeIds.includes(r.id) || r.id === value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
        <span className="text-lg">{medals[rank]}</span>
        {labels[rank]}
      </div>
      <RoleSelector 
        roles={filteredRoles}
        value={value}
        onChange={onChange}
        placeholder="Select reward role"
      />
    </div>
  );
}
