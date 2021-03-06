const { MessageEmbed } = require("discord.js");
require("moment-duration-format");

module.exports = {
  name: "stats",
  description: "Displays current Bot statistics",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: ["stat", "statistics", "info"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
   */
  run: async (client, message) => {
    const stats = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle("Current LPC-Bot Statistics")
          .setURL(client.config.SupportServer)
          .addField(" \u200B ", "**Channels** : ` " + `${client.channels.cache.size}` + " `")
          .addField(" \u200B ", "**Servers** : ` " + `${client.guilds.cache.size}` + " `")
          .addField(" \u200B ", "**Users** : ` " + `${client.users.cache.size}` + " `")
    return message.channel.send({ embeds: [stats] });
  },
  SlashCommand: {
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
     */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send(`You are not allowed to use the bot in this channel.`);
      }
      const { version } = require("discord.js");
      const stats = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle("Current LPC-Bot Statistics")
          .setURL(client.config.SupportServer)
          .addField(" \u200B ", "**Channels** : ` " + `${client.channels.cache.size}` + " `")
          .addField(" \u200B ", "**Servers** : ` " + `${client.guilds.cache.size}` + " `")
          .addField(" \u200B ", "**Users** : ` " + `${client.users.cache.size}` + " `")
      interaction.send(stats)
    },
  },
};