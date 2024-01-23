const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "checkstatus",
  description: "Check your own or another officer status",
  usage: "[user]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "user",
      description: "Discord Username",
      value: "user",
      type: 6,
      required: false,
    },
  ],  
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

      let useCommand = await client.verifyUseCommand(GuildDB.serverID, interaction.member.roles);
      if (!useCommand) return interaction.send({ content:  "You don't have permission to use this command" });
      
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send({ content: `You are not logged in.` });
      if (user.user.activeCommunity == null) return interaction.send({ content: `You must join a community to use this command.` });
      if (!client.exists(args)) {
        return interaction.send({ content: `<@${interaction.member.user.id}>'s status: \`${user.user.dispatchStatus}\` | Set by: \`${user.user.dispatchStatusSetBy}\`` });
      } else {
        let targetUserID = args[0].value.replace('<@!', '').replace('>', '');
        let targetUser = await client.dbo.collection("users").findOne({"user.discord.id":targetUserID}).then(user => user);
        // This lame line of code to get username without ping on discord
        const User = client.users.cache.get(targetUserID);
        if (!targetUser) return interaction.send({ content: `Cannot find **${args[0].value}** <@${interaction.member.user.id}>` });
        if (targetUser.user.activeCommunity!=user.user.activeCommunity) {
          return interaction.send({ content: `You are not in the same community as \`${User.tag}\` <@${interaction.member.user.id}>` });
        }
        return interaction.send({ content: `<@${interaction.member.user.id}>, \`${User.tag}'s\` status: \`${targetUser.user.dispatchStatus}\` | Set by: \`${targetUser.user.dispatchStatusSetBy}\`` });
      }
    },
  },
}