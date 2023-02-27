const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "removechannel",
  description: "Remove channel from allowed channels",
  usage: "[channel]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["remove_role"],
  },
  options: [
    {
      name: "channel",
      description: "Channel to remove from allowed channles",
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
      
      if (args.length==0) return interaction.send({ content: `You must provide a channel.` });
      let channelid = args[0].value;
      let channel = client.channels.cache.get(channelid);
      if (!channel) return interaction.send({ content: `Uh Oh! The channel <#${args[0].value}> connot be found.` });
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      if (guild.server.hasCustomChannels==false) return interaction.send({ content: `There are no channels to be removed.` });
      if (!guild.server.allowedChannels.includes(channelid)) return interaction.send({ content: `The channel <#${args[0].value}> is not added to your channels.` });
      for (let i = 0; i < guild.server.allowedChannels.length; i++) {
        if (guild.server.allowedChannels[i]==channelid) {
          if ((guild.server.allowedChannels.length-1)==0) {
            client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":false}},function(err, res) {
              if (err) throw err;
              return interaction.send({ content: `Successfully removed <#${args[0].value}> from allowed channels! There are no more allowed channels.` });
            });  
          } else if ((guild.server.allowedChannels.length-1)>0) {
            client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedChannels":channelid}},function(err, res) {
              if (err) throw err;
              return interaction.send({ content: `Successfully removed <#${args[0].value}> from allowed channels.` });
            });
          }
        }
      }
    },
  },
}