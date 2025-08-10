#!/usr/bin/env node

import { Command } from 'commander';
import { addPlugin, listPlugins, enablePlugin, disablePlugin, removePlugin } from './logic';

const program = new Command();

program
  .name('cc-manager')
  .description('A CLI tool to manage claude-code configurations via plugins.')
  .version('0.1.0');

program
  .command('list')
  .description('List available and enabled plugins.')
  .action(() => {
    listPlugins();
  });

program
  .command('add <plugin-name>')
  .description('Create a new, empty plugin.')
  .action((pluginName) => {
    addPlugin(pluginName);
  });

program
  .command('enable <plugin-name>')
  .description('Activates a plugin, merging its configuration into the live environment.')
  .action((pluginName) => {
    enablePlugin(pluginName);
  });

program
  .command('disable <plugin-name>')
  .description('Deactivates a plugin, removing its configuration from the live environment.')
  .action((pluginName) => {
    disablePlugin(pluginName);
  });

program
  .command('remove <plugin-name>')
  .description('Permanently deletes a plugin from the plugins directory.')
  .action((pluginName) => {
    removePlugin(pluginName);
  });

program.parse(process.argv);
