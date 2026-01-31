# Commands that can NEVER be disabled
# Use qualified_name values (lowercase)

PROTECTED_COMMANDS: set[str] = {
    "adminrole add",
    "adminrole remove",
    "adminrole list",
    "command_disable",
    "command_enable",
    "command_status",
    "help",
}
