import fs from 'fs';
import path from 'path';
import os from 'os';

// --- File-based Config Helpers ---

export const getFileBasedConfigs = (configName: 'agents' | 'commands') => {
  const projectDir = path.join(process.cwd(), '.claude', configName);
  const userDir = path.join(os.homedir(), '.claude', configName);

  const configs = new Map<string, string>();

  if (fs.existsSync(projectDir)) {
    const projectConfigs = fs.readdirSync(projectDir);
    projectConfigs.forEach(file => configs.set(file, 'Project'));
  }

  if (fs.existsSync(userDir)) {
    const userConfigs = fs.readdirSync(userDir);
    userConfigs.forEach(file => {
      if (!configs.has(file)) {
        configs.set(file, 'User');
      }
    });
  }

  return configs;
};

export const getAgentPath = (name: string) => {
  // For now, only handles project-level agents.
  if (!name.endsWith('.md')) {
    name += '.md';
  }
  return path.join(process.cwd(), '.claude', 'agents', name);
};

export const getCommandPath = (name: string) => {
  if (!name.endsWith('.md')) {
    name += '.md';
  }
  return path.join(process.cwd(), '.claude', 'commands', name);
};


// --- Settings.json Helpers ---

export const getSettingsPath = () => {
  // For now, only handles project-level settings.
  return path.join(process.cwd(), '.claude', 'settings.json');
};

export const readSettings = (): any => {
  const settingsPath = getSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return {};
  }
  const content = fs.readFileSync(settingsPath, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error(`Error parsing settings.json: ${e}`);
    process.exit(1);
  }
};

export const writeSettings = (settings: any) => {
  const settingsPath = getSettingsPath();
  const settingsDir = path.dirname(settingsPath);
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
};
