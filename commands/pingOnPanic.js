const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "pingonpanic",
  description: "Get ping on panic status",
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
     * @param {import("discord.js").MessageCreate} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send({ content: `You are not allowed to use the bot in this channel.` });
      }
    
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      return interaction.send({ content: `Current Ping on Panic Status: \` ${guild.server.pingOnPanic} \`` });  
    },
  },
}