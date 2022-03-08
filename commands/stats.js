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
   * @param {import("../LPS")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
   */
  run: async (client, message) => {
    const stats = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle("Current LPC-Bot Statistics")
          .setURL('https://discord.gg/w2g2FFmHbF')
          .addField(" \u200B ", "**Channels** : ` " + `${client.channels.cache.size}` + " `")
          .addField(" \u200B ", "**Servers** : ` " + `${client.guilds.cache.size}` + " `")
          .addField(" \u200B ", "**Users** : ` " + `${client.users.cache.size}` + " `")
    return message.channel.send(stats)
  },
  SlashCommand: {
    /**
     *
     * @param {import("../LPS")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
     */
    run: async (client, interaction) => {
      const { version } = require("discord.js");
      const stats = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle("Current LPC-Bot Statistics")
          .setURL('https://discord.gg/w2g2FFmHbF')
          .addField(" \u200B ", "**Channels** : ` " + `${client.channels.cache.size}` + " `")
          .addField(" \u200B ", "**Servers** : ` " + `${client.guilds.cache.size}` + " `")
          .addField(" \u200B ", "**Users** : ` " + `${client.users.cache.size}` + " `")
      return message.channel.send(stats)
    },
  },
};