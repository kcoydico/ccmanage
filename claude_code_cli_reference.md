# Claude Code Configuration Reference

This document summarizes the key configuration components for `claude-code`, which will serve as the specification for `cc-manager` development.

## Overview

Claude Code uses a hierarchical configuration system. Settings are applied in the following order of precedence (highest to lowest):

1.  **Enterprise Managed Policies** (`managed-settings.json`)
2.  **Command-line arguments**
3.  **Local Project Settings** (`.claude/settings.local.json`)
4.  **Shared Project Settings** (`.claude/settings.json`)
5.  **User Settings** (`~/.claude/settings.json`)

## Configuration Types

### `settings.json`
This is the primary file for configuration. It can be found at the user-level (`~/.claude/settings.json`) and project-level (`.claude/settings.json`). It manages permissions, environment variables, tool behavior, and more in JSON format.

### Agents (Subagents)
- **What they are**: Custom AI assistants.
- **How they are managed**: As Markdown (`.md`) files.
- **Locations**:
    - User-level: `~/.claude/agents/`
    - Project-level: `.claude/agents/`

### Custom Slash Commands
- **What they are**: User-defined commands that can be invoked in the interactive session (e.g., `/mycommand`).
- **How they are managed**: As Markdown (`.md`) files. The filename (without extension) becomes the command name.
- **Locations**:
    - User-level: `~/.claude/commands/`
    - Project-level: `.claude/commands/`

### Hooks
- **What they are**: Custom scripts that run before or after a tool is executed.
- **How they are managed**: As JSON objects within the `hooks` key in `settings.json`.

### Built-in Tools (Permissions)
- **What they are**: The native tools available to Claude (e.g., `Bash`, `Edit`, `Read`).
- **How they are managed**: Through permission rules defined under the `permissions` key in `settings.json`. The `allow` and `deny` arrays control which tools can be used.

### MCP (Model Context Protocol)
- **What they are**: A protocol to extend Claude Code with additional tools and integrations.
- **How they are managed**:
    - Servers are defined in `.mcp.json` files.
    - Servers are enabled/disabled via the `enabledMcpjsonServers` and `disabledMcpjsonServers` list keys in `settings.json`.

## Management Summary
- **File-based management**: `Agents` and `Custom Slash Commands`.
- **JSON-based management (in `settings.json`)**: `Hooks`, `Built-in Tool Permissions`, and `MCP` activation.
