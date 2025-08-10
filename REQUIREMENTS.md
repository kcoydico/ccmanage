# cc-manager: Requirements Specification (Plugin Orchestrator)

## 1. System Purpose

`cc-manager` is a CLI tool that manages `claude-code` configurations through a **plugin-based system**. Instead of editing individual settings, users can enable or disable self-contained "plugins", where each plugin represents a specific goal, workflow, or toolset (e.g., "TDD", "Python-Dev").

The tool's primary role is to orchestrate the application (merging) and removal (un-merging) of configuration fragments from these plugins into the live `claude-code` configuration files.

## 2. Plugin Architecture

### 2.1. Plugin Location
- Plugins are located in the `.claude/plugins/` directory within a project.
- Each subdirectory within `.claude/plugins/` is considered a single plugin. For example, `.claude/plugins/TDD/`.

### 2.2. Plugin Structure
A plugin is a directory that may contain any of the following configuration fragments:

- **`settings.json`**: A JSON file containing `hooks`, `permissions`, `mcp` settings, or any other valid `settings.json` key. These will be deep-merged into the live `settings.json`.
- **`CLAUDE.md`**: A Markdown file whose content will be appended to the live `CLAUDE.md` file.
- **`agents/`**: A directory containing agent (`.md`) files to be symlinked into the live `.claude/agents/` directory.
- **`commands/`**: A directory containing custom slash command (`.md`) files to be symlinked into the live `.claude/commands/` directory.

## 3. State Management

The tool needs to track which plugins are enabled to manage their state and allow for clean un-installation.

- A state file will be maintained at `.claude/cc-manager.state.json`.
- This file will record which plugins are currently enabled.

## 4. Functional Requirements (Commands)

### 4.1. `list`
- **Purpose**: To display available and enabled plugins.
- **Behavior**:
    - Lists all subdirectories in `.claude/plugins/` as available plugins.
    - Cross-references with the state file (`.claude/cc-manager.state.json`) to show which plugins are currently "enabled".

### 4.2. `enable <plugin-name>`
- **Purpose**: To activate a plugin.
- **Behavior**:
    1. Reads the contents of the specified plugin directory (e.g., `.claude/plugins/TDD/`).
    2. **Merges `settings.json`**: Deep-merges the plugin's `settings.json` into the project's `.claude/settings.json`. Array values will be concatenated and de-duplicated.
    3. **Appends `CLAUDE.md`**: Appends the content of the plugin's `CLAUDE.md` to the project's `CLAUDE.md`, wrapped in clearly marked, plugin-specific start/end comment tags to allow for clean removal.
    4. **Symlinks files**: Creates symbolic links for each file in the plugin's `agents/` and `commands/` directories into the live `.claude/agents/` and `.claude/commands/` directories.
    5. **Updates State**: Records that the plugin is enabled in `.claude/cc-manager.state.json`.

### 4.3. `disable <plugin-name>`
- **Purpose**: To deactivate a plugin.
- **Behavior**:
    1. **Removes JSON settings**: Reverts the changes made to `.claude/settings.json`. This requires a sophisticated un-merge or a snapshot-based approach.
    2. **Removes `CLAUDE.md` content**: Removes the content block identified by the plugin-specific comment tags from the project's `CLAUDE.md`.
    3. **Removes symlinks**: Deletes the symbolic links created by the plugin from `.claude/agents/` and `.claude/commands/`.
    4. **Updates State**: Removes the plugin from the enabled list in `.claude/cc-manager.state.json`.

### 4.4. `add <plugin-name>`
- **Purpose**: To create a new, empty plugin.
- **Behavior**: Creates a new directory at `.claude/plugins/<plugin-name>` with the standard subdirectories (`agents/`, `commands/`) and empty template files (`settings.json`, `CLAUDE.md`).

### 4.5. `remove <plugin-name>`
- **Purpose**: To permanently delete a plugin.
- **Behavior**: Deletes the entire `.claude/plugins/<plugin-name>` directory. Fails if the plugin is currently enabled.
