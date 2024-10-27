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
      const totalGuilds = await client.shard.fetchClientValues("guilds.cache.size").then(results => {
        return results.reduce((acc, guildCount) => acc + guildCount, 0)
      });
      const totalMembers = await client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)).then(data => data.reduce((acc, memberCount) => acc + memberCount, 0));
      const stats = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle("Current LPC-Bot Statistics")
          .setURL(client.config.SupportServer)
          .setDescription(`**Servers** : \`${totalGuilds}\`\n**Users** : \`${totalMembers}\``)
      interaction.send({ embeds: [stats] })
    },
  },
};