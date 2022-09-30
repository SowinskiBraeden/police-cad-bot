const fs = require("fs");
const path = require("path");
const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

/**
 * Register slash commands for a guild
 * @param {require("../structures/LinesPoliceCadBot")} client
 * @param {string} guild
 */
module.exports = async function(client, guild) {
  const commands = [];
  const commandFiles = fs.readdirSync(path.join(__dirname, "..", "commands")).filter(file => file.endsWith('.js'));

  // Place your client and guild ids here
  const clientId = client.application.id;
  const guildId = guild;

  for (const file of commandFiles) {
    const command = require(`../commands/${file}`);
    commands.push(command);
  }

  const rest = new REST({ version: '10' }).setToken(client.config.Token);

  try {
    client.log(`[${guildId}] Started refreshing guild (/) commands.`);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );

    client.log(`[${guildId}] Successfully reloaded guild (/) commands.`);
  } catch (error) {
    client.error(error);
  }
};