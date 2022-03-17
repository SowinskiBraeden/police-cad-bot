const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "removechannel",
  description: "Remove channel from allowed channels",
  usage: "[channel]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["remove_role"],
  },
  aliases: [],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").MessageCreate} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message) => {
    if (args.length==0) return message.channel.send(`You must provide a channel.`);
    let channelid = args[0].replace('<#', '').replace('>', '');
    let channel = client.channels.cache.get(channelid);
    if (!channel) return message.channel.send(`Uh Oh! The channel ${args[0]} connot be found.`);
    let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.hasCustomChannels==false) return message.channel.send(`There are no channels to be removed.`);
    if (!guild.server.allowedChannels.includes(channelid)) return message.channel.send(`The channel ${args[0]} is not added to your roles.`);
    for (let i = 0; i < guild.server.allowedChannels.length; i++) {
      if (guild.server.allowedChannels[i]==channelid) {
        if ((guild.server.allowedChannels.length-1)==0) {
          client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":false}},function(err, res) {
            if (err) throw err;
            return message.channel.send(`Successfully removed ${args[0]} from allowed channels ${message.author}! There are no more allowed channels.`);
          });  
        } else if ((guild.server.allowedChannels.length-1)>0) {
          client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedChannels":channelid}},function(err, res) {
            if (err) throw err;
            return message.channel.send(`Successfully removed ${args[0]} from allowed channels.`);
          });
        }
      }
    }
  },
  SlashCommand: {
    options: [
      {
        name: "channel",
        description: "Channel to remove from allowed channles",
        value: "channel",
        type: 7,
        required: true,
      },
    ],  
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").MessageCreate} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send(`You are not allowed to use the bot in this channel.`);
      }
      
      if (args.length==0) return interaction.send(`You must provide a channel.`);
      let channelid = args[0].value;
      let channel = client.channels.cache.get(channelid);
      if (!channel) return interaction.send(`Uh Oh! The channel <#${args[0].value}> connot be found.`);
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      if (guild.server.hasCustomChannels==false) return interaction.send(`There are no channels to be removed.`);
      if (!guild.server.allowedChannels.includes(channelid)) return interaction.send(`The channel <#${args[0].value}> is not added to your roles.`);
      for (let i = 0; i < guild.server.allowedChannels.length; i++) {
        if (guild.server.allowedChannels[i]==channelid) {
          if ((guild.server.allowedChannels.length-1)==0) {
            client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":false}},function(err, res) {
              if (err) throw err;
              return interaction.send(`Successfully removed <#${args[0].value}> from allowed channels! There are no more allowed channels.`);
            });  
          } else if ((guild.server.allowedChannels.length-1)>0) {
            client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedChannels":channelid}},function(err, res) {
              if (err) throw err;
              return interaction.send(`Successfully removed <#${args[0].value}> from allowed channels.`);
            });
          }
        }
      }
    },
  },
}