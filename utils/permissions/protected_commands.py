"""
Commands that can NEVER be disabled.
Always use `command.qualified_name` (lowercase).
Examples:
- help
- adminrole add
- command disable
"""

PROTECTED_COMMANDS: set[str] = {
    # Core
    "help",

    # Bot admin role management
    "adminrole",

    # Command control
    "command disable",
    "command enable",
    "command status",
}
