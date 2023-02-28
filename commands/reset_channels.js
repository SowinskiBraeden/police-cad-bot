const { EmbedBuilder } = require('discord.js');
const bitfieldCalculator = require('discord-bitfield-calculator');

module.exports = {
  name: "reset_channels",
  description: "Reset the configured channels for the bot",
  usage: "[channel]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  SlashCommand: {
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").MessageCreate} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      const permissions = bitfieldCalculator.permissions(interaction.member.permissions);
      if (!permissions.includes("MANAGE_GUILD")) return interaction.send({ content: 'You don\'t have the permissions to use this command.' });

      client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$set:{"server.allowedChannels": [], "server.hasCustomChannels": false}},function(err, res) {
        if (err) throw err;
        return interaction.send({ content: `Successfully reset all configured channels` });
      });
    },
  },
}