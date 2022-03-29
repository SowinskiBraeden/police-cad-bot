const fs = require("fs");
const path = require("path");

/**
 * Register slash commands for a guild
 * @param {require("../structures/LinesPoliceCadBot")} client
 * @param {string} guild
 */
module.exports = (client, guild) => {
 
  let commandsDir = path.join(__dirname, "..", "commands");

  fs.readdir(commandsDir, (err, files) => {
    if (err) throw err;
    files.forEach(async (file) => {
      let cmd = require(commandsDir + "/" + file);
      if (!cmd.SlashCommand || !cmd.SlashCommand.run) return;
      let dataStuff = {
        name: cmd.name,
        description: cmd.description,
        options: cmd.SlashCommand.options,
      };

      //Creating variables like this, So you might understand my code :)
      let ClientAPI = client.api.applications(client.user.id);
      let GuildAPI = ClientAPI.guilds(guild);

      try {
        await GuildAPI.commands.post({ data: dataStuff });
      } catch (e) {
        client.log('Error: API missing permissions, re-invite the bot');

        // Forces bot to leave server
        let guildID = client.guilds.cache.get(guild);
        if (guildID) guildID.leave();
      }
    });
  });
};