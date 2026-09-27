import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

async function generateDocs() {
  const commandsDir = path.join(process.cwd(), 'src', 'commands');
  const categories = fs.readdirSync(commandsDir);
  const prefix = process.env.PREFIX || 'dv';

  let markdown = '# DV-BOT Command Reference\n\n';
  markdown += '> This document provides a complete list of all available commands, their categories, descriptions, and usage syntax.\n';
  markdown += `> All commands can be triggered using Slash Commands (\`/\`) or the configured prefix (default: \`${prefix}\`).\n\n`;

  for (const category of categories) {
    const categoryPath = path.join(commandsDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;
    
    markdown += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    markdown += '| Command | Description | Slash Usage | Prefix Usage |\n';
    markdown += '|---------|-------------|-------------|--------------|\n';
    
    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const filePath = path.join(categoryPath, file);
        const module = await import(pathToFileURL(filePath).href);
        const cmd = module.default;
        
        if (!cmd) continue;

        const name = cmd.name;
        const desc = cmd.description || 'No description provided.';
        
        let argsStr = "";
        if (cmd.slashBuilder && cmd.slashBuilder.options) {
            const opts = cmd.slashBuilder.options.map(opt => {
                const json = typeof opt.toJSON === 'function' ? opt.toJSON() : opt;
                return json.required ? `<${json.name}>` : `[${json.name}]`;
            }).join(' ');
            argsStr = opts ? ` ${opts}` : '';
        }

        let slashUsage = `/${name}${argsStr}`;
        let prefixUsage = `${prefix}${name}${argsStr}`;
        
        // Escape HTML brackets for markdown table
        slashUsage = slashUsage.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        prefixUsage = prefixUsage.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        markdown += `| \`/${name}\` | ${desc} | \`${slashUsage}\` | \`${prefixUsage}\` |\n`;
      } catch (err) {
        console.error(`Error loading ${file}:`, err);
      }
    }
    markdown += '\n';
  }

  fs.writeFileSync('COMMANDS.md', markdown);
  console.log('Successfully generated COMMANDS.md');
}

generateDocs();
