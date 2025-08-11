# Secure Mode Plugin

This plugin enhances security by disabling tools that can modify files or execute arbitrary code. Enable this plugin when you want to ensure the assistant operates in a "read-only" mode.

## Disabled Tools
This plugin explicitly denies permission for the following tools:
- `run_in_bash_session`
- `create_file_with_block`
- `overwrite_file_with_block`
- `replace_with_git_merge_diff`
- `delete_file`
- `rename_file`
- `submit`
