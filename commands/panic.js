const { MessageEmbed } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "panic",
  description: "Enables users panic button",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: ["enablepanic"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message) => {
    let useCommand = await client.verifyUseCommand(GuildDB.serverID, message.member.roles.cache, false);
    if (!useCommand) return message.channel.send("You don't have permission to use this command");

    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in.`);
    if (user.user.activeCommunity==null) return message.channel.send(`You must join a community to use this command.`);
    const socket = io.connect(client.config.socket);
    // If panic is enabled, disable panic
    if (user.user.dispatchStatus=='Panic') {
      let myReq = {
        userID: user._id,
        communityID: user.user.activeCommunity
      };
      socket.emit('clear_panic', myReq);

      let myUpdateReq = {
        userID: user._id,
        status: '10-8',
        setBy: 'System',
        onDuty: null,
        updateDuty: false
      };
      socket.emit('bot_update_status', myUpdateReq);
      socket.on('bot_updated_status', (res) => { 
        message.channel.send(`Disabled Panic ${message.author} and set status to \`10-8\`.`);
        socket.disconnect();
      });
      return;
    
    // If panic is disabled, enable panic
    } else {
      let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
      if (!user) return message.channel.send(`You are not logged in.`);
      if (user.user.activeCommunity==null) return message.channel.send(`You must join a community to use this command.`);  
      client.forceUpdateStatus('Panic', user);

      let req = {
        userID: user._id,
        userUsername: user.user.username,
        activeCommunity: user.user.activeCommunity
      }
      socket.emit('panic_button_update', req);
      socket.disconnect();
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
      if (guild.server.pingOnPanic) return message.channel.send(`Attention <@&${guild.server.pingRole}>! \`${user.user.username}\` has activated panic`);
      return;
    }
  },
  SlashCommand: {
    options: [],  
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
      if (!user) return interaction.send(`You are not logged in.`);
      if (user.user.activeCommunity==null) return interaction.send(`You must join a community to use this command.`);
      const socket = io.connect(client.config.socket);
      // If panic is enabled, disable panic
      if (user.user.dispatchStatus=='Panic') {
        let myReq = {
          userID: user._id,
          communityID: user.user.activeCommunity
        };
        socket.emit('clear_panic', myReq);

        let myUpdateReq = {
          userID: user._id,
          status: '10-8',
          setBy: 'System',
          onDuty: null,
          updateDuty: false
        };
        socket.emit('bot_update_status', myUpdateReq);
        socket.on('bot_updated_status', (res) => { 
          interaction.send(`Disabled Panic <@${interaction.member.user.id}> and set status to \`10-8\`.`);
          socket.disconnect();
        });
        return;
      // If panic is disabled, enable panic
      } else {
        let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
        if (!user) return interaction.send(`You are not logged in.`);
        if (user.user.activeCommunity==null) return interaction.send(`You must join a community to use this command.`);  
        client.forceUpdateStatus('Panic', user);
         
        let req = {
          userID: user._id,
          userUsername: user.user.username,
          activeCommunity: user.user.activeCommunity
        }
        socket.emit('panic_button_update', req);
        socket.disconnect();
        let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":GuildDB.serverID}).then(guild => guild);
        if (guild.server.pingOnPanic) return interaction.send(`Attention <@&${guild.server.pingRole}>! \`${user.user.username}\` has activated panic`);
        return;
      }
    },
  },
}