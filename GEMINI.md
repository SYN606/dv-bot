# DV-BOT Development Guidelines & TypeScript Invariants

## 1. Database Model & Active Record Conventions
- **`findOrCreate` Destructuring**:
  Always annotate destructured results from `findOrCreate` calls with `: any` to avoid TypeScript's `(ModelInstance | boolean)[]` union inference:
  ```ts
  const [record, created]: any = await Model.findOrCreate({ where, defaults });
  ```
- **Dynamic Payloads & Query Objects**:
  Any object that will receive conditional, optional, or incremental keys after instantiation must be explicitly typed as `Record<string, any>`:
  ```ts
  const payload: Record<string, any> = { guild_id, updated_at };
  const where: Record<string, any> = { guild_id };
  const updates: Record<string, any> = { status };
  ```
- **Collection Sets & Maps**:
  Always provide explicit type parameters when instantiating sets or maps:
  ```ts
  const activeKeys = new Set<string>();
  const idMap = new Map<string, number>();
  ```

## 2. Discord.js Builder Generic Rules
- **Modal Action Rows**:
  Discord.js Modals only support text inputs. Always supply the generic parameter to `ActionRowBuilder` when attaching to `ModalBuilder`:
  ```ts
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(textInput)
  );
  ```

## 3. Editing Guidelines (Windows / Cross-Platform)
- When using `edit_file` on Windows worktrees, prefer concise single-line targets over large multi-line blocks to prevent CRLF/LF line-ending mismatch errors.
