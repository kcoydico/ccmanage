import fs from 'fs';
import path from 'path';
import mergeWith from 'lodash.mergewith';

// --- Type Definitions ---

export interface PluginState {
  enabled: string[];
}

// --- Path Helpers ---

const getClaudeDir = () => path.join(process.cwd(), '.claude');
export const getPluginsDir = () => path.join(getClaudeDir(), 'plugins');
export const getPluginPath = (pluginName: string) => path.join(getPluginsDir(), pluginName);
export const getStateFilePath = () => path.join(getClaudeDir(), 'cc-manager.state.json');

// --- State Management ---

export const readState = (): PluginState => {
  const stateFilePath = getStateFilePath();
  if (!fs.existsSync(stateFilePath)) {
    return { enabled: [] };
  }
  try {
    const content = fs.readFileSync(stateFilePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading state file, starting with empty state.', error);
    return { enabled: [] };
  }
};

export const writeState = (state: PluginState) => {
  const stateFilePath = getStateFilePath();
  const claudeDir = getClaudeDir();
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
};

// --- Core Sync Logic ---

const customizer = (objValue: any, srcValue: any) => {
  if (Array.isArray(objValue)) {
    return [...new Set([...objValue, ...srcValue])];
  }
};

/**
 * Regenerates the entire claude-code configuration from the list of enabled plugins.
 * This is the source of truth.
 */
const syncConfig = (enabledPlugins: string[]) => {
  console.log('Syncing configuration with state...');

  // 1. Clear existing managed configurations
  const liveAgentsDir = path.join(getClaudeDir(), 'agents');
  const liveCommandsDir = path.join(getClaudeDir(), 'commands');
  [liveAgentsDir, liveCommandsDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.lstatSync(filePath).isSymbolicLink()) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  const liveClaudeMdPath = path.join(getClaudeDir(), 'CLAUDE.md');
  if (fs.existsSync(liveClaudeMdPath)) {
      fs.writeFileSync(liveClaudeMdPath, ''); // Clear the file
  }

  // 2. Apply all enabled plugins sequentially
  let liveSettings = {};
  let liveClaudeMdContent = '';

  enabledPlugins.forEach(pluginName => {
    console.log(`- Applying plugin: ${pluginName}`);
    const pluginPath = getPluginPath(pluginName);

    // Merge settings
    const pluginSettingsPath = path.join(pluginPath, 'settings.json');
    if (fs.existsSync(pluginSettingsPath)) {
      const pluginSettings = JSON.parse(fs.readFileSync(pluginSettingsPath, 'utf-8'));
      liveSettings = mergeWith(liveSettings, pluginSettings, customizer);
    }

    // Append CLAUDE.md
    const pluginClaudeMdPath = path.join(pluginPath, 'CLAUDE.md');
    if (fs.existsSync(pluginClaudeMdPath)) {
      const pluginContent = fs.readFileSync(pluginClaudeMdPath, 'utf-8');
      const startMarker = `<!-- BEGIN PLUGIN: ${pluginName} -->`;
      const endMarker = `<!-- END PLUGIN: ${pluginName} -->`;
      liveClaudeMdContent += `\n\n${startMarker}\n${pluginContent}\n${endMarker}\n`;
    }

    // Create symlinks
    ['agents', 'commands'].forEach(dir => {
      const liveDir = path.join(getClaudeDir(), dir);
      const pluginDir = path.join(pluginPath, dir);
      if (!fs.existsSync(liveDir)) fs.mkdirSync(liveDir, { recursive: true });

      if (fs.existsSync(pluginDir)) {
        fs.readdirSync(pluginDir).forEach(file => {
          const sourcePath = path.join(pluginDir, file);
          const destPath = path.join(liveDir, file);
          if (!fs.existsSync(destPath)) {
            fs.symlinkSync(sourcePath, destPath);
          }
        });
      }
    });
  });

  // 3. Write the final generated files
  const liveSettingsPath = path.join(getClaudeDir(), 'settings.json');
  fs.writeFileSync(liveSettingsPath, JSON.stringify(liveSettings, null, 2));
  fs.writeFileSync(liveClaudeMdPath, liveClaudeMdContent.trim());

  console.log('Sync complete.');
};


// --- Plugin Commands ---

export const listPlugins = () => {
  const pluginsDir = getPluginsDir();
  if (!fs.existsSync(pluginsDir)) {
    console.log('No plugins found. (Directory .claude/plugins/ does not exist)');
    return;
  }

  const state = readState();
  const enabledPlugins = new Set(state.enabled);

  const availablePlugins = fs.readdirSync(pluginsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  if (availablePlugins.length === 0) {
    console.log('No plugins available.');
    return;
  }

  console.log('Available Plugins:');
  availablePlugins.forEach(pluginName => {
    const status = enabledPlugins.has(pluginName) ? 'enabled' : 'available';
    console.log(`- ${pluginName} (${status})`);
  });
};

export const addPlugin = (pluginName: string) => {
  const pluginPath = getPluginPath(pluginName);

  if (fs.existsSync(pluginPath)) {
    console.error(`Plugin "${pluginName}" already exists at ${pluginPath}`);
    process.exit(1);
  }

  console.log(`Creating plugin "${pluginName}" at ${pluginPath}...`);

  fs.mkdirSync(pluginPath, { recursive: true });
  fs.mkdirSync(path.join(pluginPath, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(pluginPath, 'commands'), { recursive: true });
  fs.writeFileSync(path.join(pluginPath, 'settings.json'), JSON.stringify({}, null, 2));
  fs.writeFileSync(path.join(pluginPath, 'CLAUDE.md'), `# ${pluginName}\n\nThis plugin is for...\n`);

  console.log(`Plugin "${pluginName}" created successfully.`);
};

export const enablePlugin = (pluginName: string) => {
  const pluginPath = getPluginPath(pluginName);
  if (!fs.existsSync(pluginPath)) {
    console.error(`Plugin "${pluginName}" not found.`);
    process.exit(1);
  }

  const state = readState();
  if (state.enabled.includes(pluginName)) {
    console.log(`Plugin "${pluginName}" is already enabled.`);
    return;
  }

  // Update state
  const newEnabled = [...state.enabled, pluginName];
  writeState({ enabled: newEnabled });

  // Re-generate config
  syncConfig(newEnabled);

  console.log(`Plugin "${pluginName}" enabled successfully.`);
};

export const disablePlugin = (pluginName: string) => {
  const pluginPath = getPluginPath(pluginName);
  if (!fs.existsSync(pluginPath)) {
    console.error(`Plugin "${pluginName}" not found.`);
    // A bit of a weird state, but we should still proceed to remove it from the enabled list.
  }

  const state = readState();
  if (!state.enabled.includes(pluginName)) {
    console.log(`Plugin "${pluginName}" is not enabled.`);
    return;
  }

  // Update state
  const newEnabled = state.enabled.filter(p => p !== pluginName);
  writeState({ enabled: newEnabled });

  // Re-generate config
  syncConfig(newEnabled);

  console.log(`Plugin "${pluginName}" disabled successfully.`);
};

export const removePlugin = (pluginName: string) => {
  const pluginPath = getPluginPath(pluginName);
  if (!fs.existsSync(pluginPath)) {
    console.error(`Plugin "${pluginName}" not found.`);
    process.exit(1);
  }

  const state = readState();
  if (state.enabled.includes(pluginName)) {
    console.error(`Error: Cannot remove an enabled plugin. Please disable "${pluginName}" first.`);
    process.exit(1);
  }

  console.log(`Removing plugin "${pluginName}"...`);
  fs.rmSync(pluginPath, { recursive: true, force: true });
  console.log(`Plugin "${pluginName}" removed successfully.`);
};
