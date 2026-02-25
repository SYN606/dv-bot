# 🛡️ Digital Vigital  
### Advanced Discord Moderation Framework

A production-ready, fully async Discord moderation system with interactive setup panels, persistent UI, and database-backed configuration.

---

## ✨ Core Features

### 🛡️ Verification System
- Interactive `/verify_setup` panel
- Persistent verification button
- Captcha-based modal verification
- Automatic role assignment
- `/reset_verification` full cleanup



<p align="center">
  <a href="#verification-system"><img src="https://img.shields.io/badge/Verification-System-5865F2?style=for-the-badge&logo=discord&logoColor=white"></a>
  <a href="#moderation-system"><img src="https://img.shields.io/badge/Moderation-System-DA373C?style=for-the-badge&logo=shield&logoColor=white"></a>
  <a href="#bot-admin-system"><img src="https://img.shields.io/badge/Bot-Admin-System-1F8B4C?style=for-the-badge&logo=users&logoColor=white"></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/Architecture-8E44AD?style=for-the-badge"></a>
</p>


### 👮 Custom Bot Admin System
- Delegated bot-admin roles (DB-backed)
- Secure permission resolution:
  - Guild Owner
  - Discord Administrator
  - Custom Bot-Admin Role
- Used across moderation & configuration systems

### 🔨 Moderation
- Role-based tempban system
- Verified role removal & restoration
- Active record tracking
- Expiry support
- Moderation logging

### 📜 Logging System
- Configurable log channels
- Logs moderation and verification actions
- Database-backed configuration

### 📌 Utility Systems
- Sticky messages
- Media-only channels
- Counting channels
- AFK tracking
- Command restriction system

---

## 🎨 Embed Framework (v2.2)

Modern dark-mode embed system with:

- Severity levels (INFO, SUCCESS, WARNING, ERROR, DEBUG, SYSTEM)
- Safe text trimming
- Automatic timestamps
- Dynamic footers
- Emoji-based visual indicators

---

## ⚡ Architecture

- Fully async (SQLAlchemy AsyncSession)
- Persistent Discord Views
- Interaction-safe defer/followup pattern
- Role hierarchy protection
- Database-backed for all features
- Modular cog-based structure

---
