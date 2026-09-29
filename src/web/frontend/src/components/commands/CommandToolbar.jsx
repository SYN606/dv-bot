import React from "react";
import { Search } from "lucide-react";

export default function CommandToolbar({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, categories }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search commands or descriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      <div className="shrink-0 flex items-center bg-slate-900 border border-white/10 rounded-2xl p-1 overflow-x-auto scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
