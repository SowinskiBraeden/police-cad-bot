const { EmbedBuilder } = require("discord.js");
require("moment-duration-format");

module.exports = {
  name: "stats",
  description: "Displays current Bot statistics",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [],
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
        return interaction.send({ content: `You are not allowed to use the bot in this channel.` });
      }
      const { version } = require("discord.js");
      const stats = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle("Current LPC-Bot Statistics")
          .setURL(client.config.SupportServer)
          .setDescription(`**Channels** : \`${client.channels.cache.size}\`\n**Servers** : \`${client.guilds.cache.size}\`\n**Users** : \`${client.users.cache.size}\``)
      interaction.send({ embeds: [stats] })
    },
  },
};