const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "setchannel",
  description: "Add channel to allowed channels",
  usage: "[channel]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  options: [
    {
      name: "channel",
      description: "Channel to add to allowed channles",
      value: "channel",
      type: 7,
      required: true,
    },
  ],  
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
      
      let channelid = args[0].value;
      let channel = client.channels.cache.get(channelid);
      if (!channel) return interaction.send({ content: `Cannot find that channel.` });
      if (channel.type=="voice") return interaction.send({ content: `Connot set voice channel to preferred channel.` });
      if (channel.deleted) return interaction.send({ content: `Connot set deleted channel to preferred channel.` });
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      if (client.exists(guild.server.allowedChannels)&&guild.server.allowedChannels.includes(channelid)) return interaction.send({ content: `The channel <#${args[0].value}> has already been added.` });
      client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$push:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":true}},function(err, res) {
        if (err) throw err;
        return interaction.send({ content: `Successfully added <#${args[0].value}> to allowed channels.` });
      });
    },
  },
}