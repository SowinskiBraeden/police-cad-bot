const { MessageEmbed } = require('discord.js');
const exists = require('../util/Exists');

module.exports = {
  name: "setchannel",
  description: "Add channel to allowed channels",
  usage: "[channel]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  aliases: ["set_channel", "addchannel", "add_channel"],
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
    if (!channel) return message.channel.send(`Cannot find that channel.`);
    if (channel.type=="voice") return message.channel.send(`Connot set voice channel to preferred channel.`);
    if (channel.deleted) return message.channel.send(`Connot set deleted channel to preferred channel.`);
    let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (exists(guild.server.allowedChannels)&&guild.server.allowedChannels.includes(channelid)) return message.channel.send(`The channel ${args[0]} has already been added.`);
    client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$push:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":true}},function(err, res) {
      if (err) throw err;
      return message.channel.send(`Successfully added ${args[0]} to allowed channels.`);
    });
  },
  SlashCommand: {
    options: [
      {
        name: "channel",
        description: "Channel to add to allowed channles",
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
      
      let channelid = args[0].value;
      let channel = client.channels.cache.get(channelid);
      if (!channel) return message.channel.send(`Cannot find that channel.`);
      if (channel.type=="voice") return interaction.send(`Connot set voice channel to preferred channel.`);
      if (channel.deleted) return interaction.send(`Connot set deleted channel to preferred channel.`);
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      if (exists(guild.server.allowedChannels)&&guild.server.allowedChannels.includes(channelid)) return interaction.send(`The channel ${args[0]} has already been added.`);
      client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$push:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":true}},function(err, res) {
        if (err) throw err;
        return interaction.send(`Successfully added ${args[0]} to allowed channels.`);
      });
    },
  },
}