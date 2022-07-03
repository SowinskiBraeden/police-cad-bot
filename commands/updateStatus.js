const { MessageEmbed } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "updatestatus",
  description: "Change User status",
  usage: "[status]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: ["update_status"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args, { GuildDB }) => {
    let useCommand = await client.verifyUseCommand(GuildDB.serverID, message.member.roles.cache, false);
    if (!useCommand) return message.channel.send("You don't have permission to use this command");

    let validStatus=['10-8','10-7','10-6','10-11','10-23','10-97','10-15','10-70','10-80', '10-41', '10-42'];
    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    if (user.user.activeCommunity==null) return message.channel.send(`You must join a community to use this command.`);
    if (args.length==0) return message.channel.send(`You must provide a new status.`);
    if (!validStatus.includes(args[0])) return message.channel.send(`\`${args[0]}\` is a Invalid Status.`);
    let onDuty=null;
    let updateDuty=false;
    let status = args[0]
    if (args[0]=='10-41') {
      onDuty=true;
      updateDuty=true;
      status='Online';
    }
    if (args[0]=='10-42') {
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
      message.channel.send(`Succesfully updated status to \`${args[0]}\` ${message.author}`);
      socket.disconnect();
    });
  },
  SlashCommand: {
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
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send(`You are not allowed to use the bot in this channel.`);
      }

      let useCommand = await client.verifyUseCommand(GuildDB.serverID, interaction.member.roles, true);
      if (!useCommand) return interaction.send("You don't have permission to use this command");

      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send(`You are not logged in <@${interactoin.member.user.id}>`);
      if (user.user.activeCommunity==null) return interaction.send(`You must join a community to use this command.`);
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
        interaction.send(`Succesfully updated <@${interaction.member.user.id}>'s status to \`${args[0].value}\``);
        socket.disconnect();
      });  
    },
  },
}