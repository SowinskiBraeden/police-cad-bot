const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "reset-channels",
  description: "Reset channels",
  usage: "[",
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
      client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{set:{"server.allowedChannels":[]},$set:{"server.hasCustomChannels":false}},function(err, res) {
        if (err) throw err;
        return interaction.send({ content: `Successfully reset channels..` });
      });
    },
  },
}