# 🛡️ Digital Vigital
### Advanced Discord Moderation & Management Framework

A production-ready, high-performance, fully async Discord framework powered by **discord.py 2.x** and **Tortoise-ORM**. Features interactive setup panels, persistent UI components, dynamic command directories, and database-backed guild configurations.

---

<p align="center">
  <a href="#-verification-system"><img src="https://img.shields.io/badge/Verification-System-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Verification System"></a>
  <a href="#-moderation--logging"><img src="https://img.shields.io/badge/Moderation-System-DA373C?style=for-the-badge&logo=shield&logoColor=white" alt="Moderation System"></a>
  <a href="#-bot-admin--permissions"><img src="https://img.shields.io/badge/Bot--Admin-System-1F8B4C?style=for-the-badge&logo=users&logoColor=white" alt="Bot Admin"></a>
  <a href="#-tech-stack--architecture"><img src="https://img.shields.io/badge/Architecture-Tortoise--ORM-8E44AD?style=for-the-badge&logo=postgresql&logoColor=white" alt="Architecture"></a>
</p>

---

## ✨ Core Systems

### 📖 Dynamic Help & Directory
* **Hybrid Command Support:** Uniform support across standard prefix (`!`) and slash (`/`) commands.
* **Interactive Command Directory:** Dynamic dropdown navigation with category-filtered command trees based on user permissions and channel restrictions.
* **Autocomplete Inspection:** Fast, interactive autocomplete for detailed syntax, alias, and permission lookups via `/help <command_name>`.

### 🛡️ Verification System
* Interactive `/verify_setup` panel deployment.
* Persistent UI buttons that survive bot restarts.
* Captcha-based modal verification.
* Automatic role assignment upon successful verification.
* Full cleanup and reset capabilities using `/reset_verification`.

### 👮 Bot Admin & Permissions
* **Delegated Roles:** Database-backed custom bot-admin roles per guild.
* **Hierarchical Permission Resolution:**
  1. Guild Owner
  2. Server Administrator (`administrator` permission)
  3. Custom Bot-Admin Role
* Role hierarchy validation prevents accidental target escalation on higher-privileged users.

### 🔨 Moderation & Logging
* **Role-Based Tempbans:** Automatic temporary bans with timed expirations.
* **Role Restoration:** Removal and automatic restoration of verified roles post-punishment.
* **Configurable Logging:** Centralized guild audit and moderation logs.
* **Active Case Tracking:** Database records stored for active tempbans, mutes, and warning histories.

### 📌 Utility Modules
* **Command Restriction:** Per-channel command blacklisting (`get_restricted_commands`) enforced dynamically across help menus and invocation handlers.
* **Sticky Messages:** Auto-reposting persistent channel notes.
* **Media-Only & Counting Channels:** Automated enforcement rules per channel.
* **AFK Tracking:** Global and guild-specific AFK status management with auto-mentions notification.

---

## 🎨 Embed Framework

Built-in standardized dark-mode embed system (`make_embed`) featuring:
* **Severity Levels:** `INFO`, `SUCCESS`, `WARNING`, `ERROR`, `DEBUG`, `SYSTEM`
* **Auto-Formatting:** Safe text trimming, custom status emojis, and standardized footers.
* **Interaction Safe:** Native compatibility with deferred responses and interaction follow-ups.

---

## ⚡ Tech Stack & Architecture

* **Framework:** Python 3.11+ | `discord.py` 2.6+
* **Database & ORM:** Tortoise-ORM with `asyncpg` (PostgreSQL)
* **Async Engine:** Native Python `asyncio` loop
* **Persistence:** Fully persistent Discord `ui.View` & `ui.Select` handling across client restarts

---

## 🛠️ Environment & Setup

### Environment Variables (`.env`)
```env
TOKEN=your_discord_bot_token
DATABASE_URL=postgres://user:password@localhost:5432/digital_vigital
HELP_BANNER_GIF=[https://your-domain.com/banner.gif](https://your-domain.com/banner.gif)
```

### Installation


# Clone the repository
```bash
git clone https://github.com/your-repo/digital-vigital.git
cd digital-vigital
```

# Create and activate virtual environment
```bash
python -m venv .venv
source .venv/bin/activate  
# On Windows: .venv\Scripts\activate
```

# Install dependencies
```bash
pip install -r requirements.txt
```

# Run the bot
```bash
python bot.py
```