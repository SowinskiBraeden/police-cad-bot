const { EmbedBuilder } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "updatestatus",
  description: "Change User status",
  usage: "[status]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "status",
      description: "New Status Value",
      value: "status",
      type: 3,
      required: true,
      choices: [
        { name: '10-8 (In Service)', value: '10-8', }, { name: '10-7 (Out of Service)', value: '10-7', }, { name: '10-6 (Busy)', value: '10-6', },
        { name: '10-11 (Traffic Stop)', value: '10-11', }, { name: '10-23 (Arrive on Scene', value: '10-23', }, { name: '10-97 (In Route)', value: '10-97' },
        { name: '10-15 (Subject in Custody)', value: '10-15', }, { name: '10-70 (Foot Pursuit)', value: '10-70', }, { name: '10-80 (Vehicle Pursuit)', value: '10-80' },
        { name: '10-41 (Log in to CAD)', value: '10-41', }, { name: '10-42 (Log out of CAD)', value: '10-42' },
      ],
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
      if (!useCommand) return interaction.send({ content: "You don't have permission to use this command" });

      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send({ content: `You are not logged in <@${interaction.member.user.id}>` });
      if (user.user.activeCommunity==null) return interaction.send({ content: `You must join a community to use this command.` });
      let onDuty=null;
      let updateDuty=false;
      let status = args[0].value;
      if (args[0].value=='10-41') {
        onDuty=true;
        updateDuty=true;
        status='Online';
      }
      if (args[0].value=='10-42') {
        onDuty=false;
        updateDuty=true;
        status='Offline';
      }
      let req={
        userID: user._id,
        status: status,
        setBy: 'Self',
        onDuty: onDuty,
        updateDuty: updateDuty
      };
      const socket = io.connect(client.config.socket);
      socket.emit('bot_update_status', req);
      socket.on('bot_updated_status', (res) => {
        socket.disconnect();
        return interaction.send({ content: `Succesfully updated <@${interaction.member.user.id}>'s status to \`${args[0].value}\`` });
      });
      return;
    },
  },
}
