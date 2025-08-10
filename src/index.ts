#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('cc-manager')
  .description('A CLI tool to manage claude-code configurations via plugins.')
  .version('0.1.0');

import fs from 'fs';
import path from 'path';
import os from 'os';

const list = program.command('list')
  .description('List various claude-code configurations');

const getFileBasedConfigs = (configName: 'agents' | 'commands') => {
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
}

list
  .command('agents')
  .description('List all available agents')
  .action(() => {
    const agents = getFileBasedConfigs('agents');
    if (agents.size === 0) {
      console.log('No agents found.');
      return;
    }
    console.log('Available Agents:');
    agents.forEach((scope, name) => {
      console.log(`- ${name} [${scope}]`);
    });
  });

list
  .command('commands')
  .description('List all available custom slash commands')
  .action(() => {
    const commands = getFileBasedConfigs('commands');
    if (commands.size === 0) {
      console.log('No custom slash commands found.');
      return;
    }
    console.log('Available Custom Slash Commands:');
    commands.forEach((scope, name) => {
      console.log(`- /${name.replace('.md', '')} [${scope}]`);
    });
  });

list
  .command('hooks')
  .description('List configured hooks')
  .action(() => {
    // TODO: Implement hook listing from settings.json
    console.log('Listing hooks is not yet implemented.');
  });

list
  .command('mcp')
  .description('List MCP configurations')
  .action(() => {
    // TODO: Implement MCP listing from settings.json and .mcp.json
    console.log('Listing MCP configurations is not yet implemented.');
  });

list
  .command('permissions')
  .description('List configured tool permissions')
  .action(() => {
    // TODO: Implement permission listing from settings.json
    console.log('Listing permissions is not yet implemented.');
  });

// --- Settings Helpers ---

const getSettingsPath = () => {
  // For now, only handles project-level settings.
  // TODO: Add support for user-level and hierarchical settings.
  return path.join(process.cwd(), '.claude', 'settings.json');
};

const readSettings = (): any => {
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

const writeSettings = (settings: any) => {
  const settingsPath = getSettingsPath();
  const settingsDir = path.dirname(settingsPath);
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
};


// --- Enable/Disable Commands ---

const enable = program.command('enable')
  .description('Enable a configuration item');

const disable = program.command('disable')
  .description('Disable a configuration item');

enable
  .command('mcp <server-name>')
  .description('Enable an MCP server')
  .action((serverName) => {
    const settings = readSettings();

    // Ensure enabledMcpjsonServers is an array
    if (!settings.enabledMcpjsonServers) settings.enabledMcpjsonServers = [];
    const enabledSet = new Set(settings.enabledMcpjsonServers);
    enabledSet.add(serverName);
    settings.enabledMcpjsonServers = Array.from(enabledSet);

    // Ensure disabledMcpjsonServers is an array and remove the server if present
    if (settings.disabledMcpjsonServers) {
      const disabledSet = new Set(settings.disabledMcpjsonServers);
      if (disabledSet.has(serverName)) {
        disabledSet.delete(serverName);
        settings.disabledMcpjsonServers = Array.from(disabledSet);
      }
    }

    writeSettings(settings);
    console.log(`Enabled MCP server: ${serverName}`);
  });

disable
  .command('mcp <server-name>')
  .description('Disable an MCP server')
  .action((serverName) => {
    const settings = readSettings();

    // Ensure disabledMcpjsonServers is an array
    if (!settings.disabledMcpjsonServers) settings.disabledMcpjsonServers = [];
    const disabledSet = new Set(settings.disabledMcpjsonServers);
    disabledSet.add(serverName);
    settings.disabledMcpjsonServers = Array.from(disabledSet);

    // Ensure enabledMcpjsonServers is an array and remove the server if present
    if (settings.enabledMcpjsonServers) {
      const enabledSet = new Set(settings.enabledMcpjsonServers);
      if (enabledSet.has(serverName)) {
        enabledSet.delete(serverName);
        settings.enabledMcpjsonServers = Array.from(enabledSet);
      }
    }

    writeSettings(settings);
    console.log(`Disabled MCP server: ${serverName}`);
  });

enable
  .command('permission <rule>')
  .description('Enable a tool by removing it from the deny list')
  .action((rule) => {
    const settings = readSettings();
    if (settings.permissions?.deny) {
      const denySet = new Set(settings.permissions.deny);
      if (denySet.has(rule)) {
        denySet.delete(rule);
        settings.permissions.deny = Array.from(denySet);
        writeSettings(settings);
        console.log(`Enabled permission: "${rule}" (removed from deny list)`);
      } else {
        console.log(`Permission "${rule}" was not found in the deny list.`);
      }
    } else {
      console.log('No permissions deny list found in settings.');
    }
  });

disable
  .command('permission <rule>')
  .description('Disable a tool by adding it to the deny list')
  .action((rule) => {
    const settings = readSettings();
    if (!settings.permissions) settings.permissions = {};
    if (!settings.permissions.deny) settings.permissions.deny = [];

    const denySet = new Set(settings.permissions.deny);
    denySet.add(rule);
    settings.permissions.deny = Array.from(denySet);

    writeSettings(settings);
    console.log(`Disabled permission: "${rule}" (added to deny list)`);
  });


// --- Add/Remove Commands ---

const add = program.command('add')
  .description('Add a configuration item');

const remove = program.command('remove')
  .description('Remove a configuration item');

const getAgentPath = (name: string) => {
  // For now, only handles project-level agents.
  // TODO: Add support for user-level agents with a --global flag.
  if (!name.endsWith('.md')) {
    name += '.md';
  }
  return path.join(process.cwd(), '.claude', 'agents', name);
}

add
  .command('agent <name>')
  .description('Add a new agent')
  .option('-p, --prompt <prompt>', 'The prompt for the agent')
  .action((name, options) => {
    const agentPath = getAgentPath(name);
    const agentDir = path.dirname(agentPath);

    if (fs.existsSync(agentPath)) {
      console.error(`Agent "${name}" already exists.`);
      process.exit(1);
    }

    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }

    const description = name.replace('.md', '').replace('-', ' ');
    const prompt = options.prompt || `This is a custom agent for ${description}.`;

    const content = `---
description: A custom agent for ${description}
---

${prompt}
`;

    fs.writeFileSync(agentPath, content);
    console.log(`Created agent: ${agentPath}`);
  });

remove
  .command('agent <name>')
  .description('Remove an agent')
  .action((name) => {
    const agentPath = getAgentPath(name);
    if (fs.existsSync(agentPath)) {
      fs.unlinkSync(agentPath);
      console.log(`Removed agent: ${agentPath}`);
    } else {
      console.error(`Agent "${name}" not found at ${agentPath}`);
      process.exit(1);
    }
  });

const getCommandPath = (name: string) => {
  if (!name.endsWith('.md')) {
    name += '.md';
  }
  return path.join(process.cwd(), '.claude', 'commands', name);
}

add
  .command('command <name>')
  .description('Add a new custom slash command')
  .option('-p, --prompt <prompt>', 'The prompt for the command')
  .action((name, options) => {
    const commandPath = getCommandPath(name);
    const commandDir = path.dirname(commandPath);

    if (fs.existsSync(commandPath)) {
      console.error(`Command "${name}" already exists.`);
      process.exit(1);
    }

    if (!fs.existsSync(commandDir)) {
      fs.mkdirSync(commandDir, { recursive: true });
    }

    const description = name.replace('.md', '').replace('-', ' ');
    const prompt = options.prompt || `This is a custom command for ${description}.`;

    const content = `---
description: A custom command for ${description}
---

${prompt}
`;

    fs.writeFileSync(commandPath, content);
    console.log(`Created command: ${commandPath}`);
  });

remove
  .command('command <name>')
  .description('Remove a custom slash command')
  .action((name) => {
    const commandPath = getCommandPath(name);
    if (fs.existsSync(commandPath)) {
      fs.unlinkSync(commandPath);
      console.log(`Removed command: ${commandPath}`);
    } else {
      console.error(`Command "${name}" not found at ${commandPath}`);
      process.exit(1);
    }
  });

program
  .command('hello')
  .description('A simple test command')
  .action(() => {
    console.log('Hello, world!');
  });

program.parse(process.argv);
