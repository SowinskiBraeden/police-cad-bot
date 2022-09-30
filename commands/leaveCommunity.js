const { EmbedBuilder } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "leavecommunity",
  description: "Leave your active community",
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
      
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send({ content: `You are not logged in.` });
      let myReq = {
        userID: user._id
      };
      const socket = io.connect(client.config.socket);
      socket.emit('bot_leave_community', myReq);
      socket.on('bot_left_community', (data) => {
        socket.disconnect()
        if (data.error) {
          return interaction.send({ content: `${data.error}` });
        }
        return interaction.send({ content: `${data.message}` });
      });
    },
  },
}