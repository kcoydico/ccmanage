Feature: Plugin Management
  As a claude-code user,
  I want to manage configurations as plugins,
  So that I can easily switch between different development contexts like TDD or Python.

  Background:
    Given a clean slate with no ".claude" directory

  Scenario: Add a new plugin
    When I run "cc-manager add TDD"
    Then a directory ".claude/plugins/TDD" should exist
    And a file ".claude/plugins/TDD/settings.json" should exist
    And a file ".claude/plugins/TDD/CLAUDE.md" should exist
    And a directory ".claude/plugins/TDD/agents" should exist
    And a directory ".claude/plugins/TDD/commands" should exist

  Scenario: List available and enabled plugins
    Given a plugin "TDD" exists
    And a plugin "Python-Dev" exists
    And the "TDD" plugin is enabled
    When I run "cc-manager list"
    Then the output should contain "TDD (enabled)"
    And the output should contain "Python-Dev (available)"

  Scenario: Enable a plugin
    Given a plugin "TDD" exists with the following files:
      | file_path                         | content                                           |
      | settings.json                     | {"permissions": {"deny": ["WebFetch"]}}           |
      | CLAUDE.md                         | Your primary goal is Test-Driven Development.     |
      | agents/tdd-explainer.md           | Explain TDD concepts.                             |
      | commands/run-tests.md             | npm test                                          |
    And the live ".claude/settings.json" is empty
    And the live ".claude/CLAUDE.md" is empty
    When I run "cc-manager enable TDD"
    Then the live ".claude/settings.json" should contain '"deny": ["WebFetch"]'
    And the live ".claude/CLAUDE.md" should contain "Your primary goal is Test-Driven Development."
    And a symlink ".claude/agents/tdd-explainer.md" should exist
    And a symlink ".claude/commands/run-tests.md" should exist
    And the state file should show "TDD" as enabled

  Scenario: Disable a plugin
    Given a plugin "TDD" exists with the following files:
      | file_path                         | content                                           |
      | settings.json                     | {"permissions": {"deny": ["WebFetch"]}}           |
      | CLAUDE.md                         | Your primary goal is Test-Driven Development.     |
      | agents/tdd-explainer.md           | Explain TDD concepts.                             |
    And the "TDD" plugin has been enabled
    When I run "cc-manager disable TDD"
    Then the live ".claude/settings.json" should not contain '"deny": ["WebFetch"]'
    And the live ".claude/CLAUDE.md" should not contain "Your primary goal is Test-Driven Development."
    And the symlink ".claude/agents/tdd-explainer.md" should not exist
    And the state file should not show "TDD" as enabled

  Scenario: Remove a disabled plugin
    Given a plugin "TDD" exists
    And the "TDD" plugin is not enabled
    When I run "cc-manager remove TDD"
    Then the directory ".claude/plugins/TDD" should not exist

  Scenario: Attempt to remove an enabled plugin
    Given a plugin "TDD" exists
    And the "TDD" plugin is enabled
    When I run "cc-manager remove TDD"
    Then the command should fail with an error message "Cannot remove an enabled plugin. Please disable it first."
