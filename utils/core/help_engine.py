from __future__ import annotations

import inspect
import json
import logging
import os
from typing import Any, Dict, List, Optional, Set, Tuple

import discord
from discord import app_commands
from discord.ext import commands

logger = logging.getLogger("DigitalVigil.HelpEngine")

JSON_PATH = os.path.join("db", "static_db", "helps.json")

CATEGORY_META: Dict[str, Dict[str, str]] = {
    "admin": {
        "id": "admin",
        "name": "Administration",
        "emoji": "🛡️",
        "description": "Server configuration, security auditing, management tools, and administrative overrides.",
    },
    "moderation": {
        "id": "moderation",
        "name": "Moderation",
        "emoji": "🔨",
        "description": "Enforce rules, manage punishments, issue timeouts, tempbans, bans, and warnings.",
    },
    "channels": {
        "id": "channels",
        "name": "Channels & Security",
        "emoji": "📁",
        "description": "Channel lockdowns, slowmode configurations, and visibility controls.",
    },
    "analytics": {
        "id": "analytics",
        "name": "Analytics & Activity",
        "emoji": "📊",
        "description": "Server statistics, member leaderboards, activity tracking, and auto-roles.",
    },
    "voice": {
        "id": "voice",
        "name": "Voice Operations",
        "emoji": "🔊",
        "description": "Mass movement, user dragging, and automatic voice channel roles.",
    },
    "utility": {
        "id": "utility",
        "name": "Utility & Community",
        "emoji": "✨",
        "description": "General tools, information lookup, user customization, and community features.",
    },
}

_HELP_CACHE: Optional[Dict[str, Any]] = None


def get_command_type_badge(is_prefix: bool, is_slash: bool) -> str:
    """Returns a visual badge label representing invocation capability."""
    if is_prefix and is_slash:
        return "`[⇄ Hybrid]`"
    if is_slash:
        return "`[/ Slash]`"
    return "`[! Prefix]`"


def load_curated_helps_json() -> Dict[str, Dict[str, Any]]:
    """Loads and indexes curated command metadata from db/static_db/helps.json by command name and alias."""
    lookup: Dict[str, Dict[str, Any]] = {}
    if not os.path.exists(JSON_PATH):
        return lookup

    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for cat in data.get("categories", []):
            for cmd in cat.get("commands", []):
                cmd_copy = dict(cmd)
                cmd_copy["category"] = cat.get("id", "utility")
                name_key = cmd["name"].lower()
                lookup[name_key] = cmd_copy
                for alias in cmd.get("aliases", []):
                    lookup[alias.lower()] = cmd_copy
    except Exception as exc:
        logger.warning(f"[HELP ENGINE] Error reading helps.json: {exc}")

    return lookup


def _determine_category(cog: Optional[commands.Cog], default: str = "utility") -> str:
    """Infers the category domain ID from the cog's module path."""
    if not cog:
        return default
    mod = getattr(cog, "__module__", "")
    parts = mod.split(".")
    if len(parts) >= 2 and parts[0] == "cmd" and parts[1] in CATEGORY_META:
        return parts[1]
    return default


def _format_prefix_syntax(cmd: commands.Command) -> str:
    """Constructs dynamic parameter syntax string for a prefix command."""
    if isinstance(cmd, commands.Group) and cmd.commands:
        sub_names = "|".join(sorted(sc.name for sc in cmd.commands))
        return f"{cmd.name} <{sub_names}> [options]"

    parts = [cmd.name]
    for param_name, param in cmd.clean_params.items():
        if param.default is inspect.Parameter.empty:
            parts.append(f"<{param_name}>")
        else:
            parts.append(f"[{param_name}]")
    return " ".join(parts)


def _format_slash_syntax(app_cmd: app_commands.Command | app_commands.Group) -> str:
    """Constructs dynamic parameter syntax string for a slash command."""
    if isinstance(app_cmd, app_commands.Group):
        subs = sorted(c.name for c in app_cmd.commands)
        subs_str = "|".join(subs) if subs else "action"
        return f"/{app_cmd.name} <{subs_str}> [options]"

    parts = [f"/{app_cmd.name}"]
    for param in getattr(app_cmd, "parameters", []):
        if param.required:
            parts.append(f"{param.name}: <{param.name}>")
        else:
            parts.append(f"[{param.name}: {param.name}]")
    return " ".join(parts)


def _extract_permissions(cmd: Optional[commands.Command], app_cmd: Optional[app_commands.Command | app_commands.Group]) -> str:
    """Deduces required execution permissions from decorators and checks."""
    if cmd:
        cog = getattr(cmd, "cog", None)
        if cog and hasattr(cog, "has_permission_audit_access"):
            return "Administrator / Senior Moderator"
        if getattr(cmd, "_admin_command", False):
            return "Guild Owner / Bot Admin"
        if hasattr(cmd, "checks"):
            for check in cmd.checks:
                qualname = getattr(check, "__qualname__", "")
                if "has_permissions" in qualname:
                    return "Administrator"
                if "is_owner" in qualname:
                    return "Bot Owner"

    if app_cmd:
        default_perms = getattr(app_cmd, "default_permissions", None)
        if default_perms:
            if default_perms.administrator:
                return "Administrator"
            if default_perms.manage_guild:
                return "Manage Server"
            if default_perms.manage_roles:
                return "Manage Roles"
            if default_perms.manage_channels:
                return "Manage Channels"
            if default_perms.ban_members:
                return "Ban Members"
            if default_perms.kick_members:
                return "Kick Members"
            if default_perms.moderate_members:
                return "Timeout Members"

    return "None (Public)"


def introspect_bot_commands(bot: commands.Bot, invalidate: bool = False) -> Dict[str, Any]:
    """Introspects all live bot commands across prefix, slash, and cogs dynamically,

    augmenting with curated examples and descriptions from helps.json.
    """
    global _HELP_CACHE
    if _HELP_CACHE is not None and not invalidate:
        return _HELP_CACHE

    curated_map = load_curated_helps_json()

    # 1. Map Cogs to domains
    cog_domains: Dict[str, str] = {}
    for name, cog in bot.cogs.items():
        cog_domains[name] = _determine_category(cog)

    # 2. Gather live command sets
    prefix_cmds: Dict[str, commands.Command] = {c.name: c for c in bot.commands}
    slash_cmds: Dict[str, app_commands.Command | app_commands.Group] = {c.name: c for c in bot.tree.get_commands()}

    all_root_names = sorted(set(prefix_cmds.keys()) | set(slash_cmds.keys()))

    categories: Dict[str, Dict[str, Any]] = {
        cat_id: {
            "id": cat_id,
            "name": meta["name"],
            "emoji": meta["emoji"],
            "description": meta["description"],
            "commands": [],
        }
        for cat_id, meta in CATEGORY_META.items()
    }

    all_commands_list: List[Dict[str, Any]] = []

    for name in all_root_names:
        p_cmd = prefix_cmds.get(name)
        s_cmd = slash_cmds.get(name)

        is_hybrid = False
        if p_cmd and hasattr(p_cmd, "app_command") and p_cmd.app_command is not None:
            is_hybrid = True
        elif p_cmd and s_cmd:
            is_hybrid = True

        is_prefix = p_cmd is not None
        is_slash = s_cmd is not None or is_hybrid

        # Determine Cog and category
        cog = None
        if p_cmd:
            cog = getattr(p_cmd, "cog", None)
        elif s_cmd:
            cog = getattr(s_cmd, "binding", None)
            if not cog and hasattr(s_cmd, "commands") and s_cmd.commands:
                cog = getattr(s_cmd.commands[0], "binding", None)

        cog_name = cog.__class__.__name__ if cog else ""
        category_id = cog_domains.get(cog_name, "utility")

        # Curated metadata lookup
        curated = curated_map.get(name.lower(), {})
        if not curated and p_cmd:
            for a in p_cmd.aliases:
                if a.lower() in curated_map:
                    curated = curated_map[a.lower()]
                    break

        if curated.get("category") and curated["category"] in CATEGORY_META:
            category_id = curated["category"]

        # Aliases
        aliases = list(getattr(p_cmd, "aliases", []))
        if curated and "aliases" in curated:
            for ca in curated["aliases"]:
                if ca not in aliases:
                    aliases.append(ca)

        # Description
        description = curated.get("description")
        if not description:
            if p_cmd and (p_cmd.help or p_cmd.description):
                description = p_cmd.help or p_cmd.description
            elif s_cmd and getattr(s_cmd, "description", None):
                description = s_cmd.description
            else:
                description = f"Command {name}."

        # Syntax definitions
        p_syntax = curated.get("prefix_syntax")
        if not p_syntax and is_prefix and p_cmd:
            p_syntax = _format_prefix_syntax(p_cmd)

        s_syntax = curated.get("slash_syntax")
        if not s_syntax and is_slash:
            if s_cmd:
                s_syntax = _format_slash_syntax(s_cmd)
            elif is_hybrid and p_cmd:
                params = [f"{p}: <{p}>" for p in p_cmd.clean_params]
                s_syntax = f"/{name} {' '.join(params)}".strip()

        usage = curated.get("usage") or s_syntax or p_syntax or name

        # Permissions
        permissions = curated.get("permissions") or _extract_permissions(p_cmd, s_cmd)

        # Examples
        examples = curated.get("examples", [])
        if not examples:
            if is_slash and s_syntax:
                examples.append(s_syntax)
            if is_prefix and p_syntax:
                examples.append(p_syntax)

        # Subcommands details
        subcommands = []
        if p_cmd and hasattr(p_cmd, "commands"):
            for sc in p_cmd.commands:
                subcommands.append({
                    "name": sc.name,
                    "description": sc.help or sc.description or f"Subcommand {sc.name}",
                    "syntax": f"{name} {sc.name}",
                })
        elif s_cmd and hasattr(s_cmd, "commands"):
            for sc in s_cmd.commands:
                subcommands.append({
                    "name": sc.name,
                    "description": sc.description or f"Subcommand {sc.name}",
                    "syntax": f"/{name} {sc.name}",
                })

        command_data = {
            "name": name,
            "category": category_id,
            "description": description,
            "usage": usage,
            "slash_syntax": s_syntax,
            "prefix_syntax": p_syntax,
            "command_type": "hybrid" if is_hybrid else ("slash" if is_slash else "prefix"),
            "is_prefix": is_prefix,
            "is_slash": is_slash,
            "aliases": aliases,
            "permissions": permissions,
            "examples": examples,
            "subcommands": subcommands,
        }

        categories[category_id]["commands"].append(command_data)
        all_commands_list.append(command_data)

    for cat in categories.values():
        cat["commands"].sort(key=lambda c: c["name"])

    _HELP_CACHE = {
        "categories": list(categories.values()),
        "all_commands": all_commands_list,
        "total_count": len(all_commands_list),
    }

    return _HELP_CACHE


def find_command_data(tree: Dict[str, Any], query: str) -> Optional[Dict[str, Any]]:
    """Searches for command data by primary name, alias, or subcommand."""
    q = query.strip().lower()
    
    # 1. Exact primary name match
    for cat in tree.get("categories", []):
        for cmd in cat.get("commands", []):
            if cmd["name"].lower() == q:
                return cmd

    # 2. Exact alias match
    for cat in tree.get("categories", []):
        for cmd in cat.get("commands", []):
            if q in [a.lower() for a in cmd.get("aliases", [])]:
                return cmd

    # 3. Subcommand match (e.g., 'role add' or 'sticky singleline')
    parts = q.split()
    if len(parts) == 2:
        root, sub = parts[0], parts[1]
        for cat in tree.get("categories", []):
            for cmd in cat.get("commands", []):
                if cmd["name"].lower() == root or root in [a.lower() for a in cmd.get("aliases", [])]:
                    for sc in cmd.get("subcommands", []):
                        if sc["name"].lower() == sub:
                            sc_copy = dict(cmd)
                            sc_copy["name"] = f"{cmd['name']} {sc['name']}"
                            sc_copy["description"] = sc["description"]
                            sc_copy["usage"] = sc["syntax"]
                            return sc_copy

    return None


def search_command_choices(tree: Dict[str, Any], current: str, limit: int = 25) -> List[app_commands.Choice[str]]:
    """Fast autocomplete generator querying command names, aliases, and subcommands."""
    choices: List[app_commands.Choice[str]] = []
    current_lower = current.strip().lower()

    for cat in tree.get("categories", []):
        cat_name = cat["name"]
        for cmd in cat.get("commands", []):
            name = cmd["name"]
            aliases = cmd.get("aliases", [])
            subs = [f"{name} {sc['name']}" for sc in cmd.get("subcommands", [])]

            candidates = [name] + aliases + subs
            for cand in candidates:
                if current_lower in cand.lower():
                    display_label = f"{cand} ({cat_name})"
                    choices.append(app_commands.Choice(name=display_label[:100], value=cand))
                    if len(choices) >= limit:
                        return choices

    return choices
