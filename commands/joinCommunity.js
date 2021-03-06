const { MessageEmbed } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "joincommunity",
  description: "Join a community",
  usage: "[code]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: ["join"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").MessageCreate} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args) => {
    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in.`);
    if (args.length==0) return message.channel.send(`You must provide a \`Community Code\`.`);
    let myReq = {
      userID: user._id,
      communityCode: args[0]
    };
    const socket = io.connect(client.config.socket);
    socket.emit('bot_join_community', myReq);
    socket.on('bot_joined_community', (data) => {
      socket.disconnect()
      if (data.error) {
        return message.channel.send(`${data.error}`);
      }
      return message.channel.send(`Successfully joined the community \` ${data.commName} \``)
    });
  },
  SlashCommand: {
    options: [
      {
        name: "code",
        description: "Join community with community code",
        value: "code",
        type: 3,
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
      
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send(`You are not logged in.`);
      let myReq = {
        userID: user._id,
        communityCode: args[0].value
      };
      const socket = io.connect(client.config.socket);
      socket.emit('bot_join_community', myReq);
      socket.on('bot_joined_community', (data) => {
        socket.disconnect()
        if (data.error) {
          return interaction.send(`${data.error}`);
        }
        return interaction.send(`Successfully joined the community \` ${data.commName} \``)
      });
    },
  },
}