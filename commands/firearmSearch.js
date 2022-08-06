const { MessageEmbed } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "firearmsearch",
  description: "Search registered firearms",
  usage: "[Serial #]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  SlashCommand: {
    options: [
      {
        name: "serialnumber",
        description: "Firearms's serial number",
        value: "serialnumber",
        type: 3,
        required: true,
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
      if (!user) return interaction.send(`You are not logged in.`);
      let data = {
        user: user,
        query: {
          serialNumber: args[0].value,
          activeCommunityID: user.user.activeCommunity
        }
      }
      const socket = io.connect(client.config.socket);
      socket.emit('bot_firearm_search', data);
      socket.on('bot_firearm_search_results', results => {
        if (results.user._id==user._id) {
          if (results.firearms.length==0) {
            return interaction.send(`No Firearms found <@${interaction.member.user.id}>`);
          }

          for (let i = 0; i < results.firearms.length; i++) {
            let firearmResult = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`**${results.firearms[i].firearm.serialNumber} | ${results.firearms[i]._id}**`)
            .setURL('https://discord.gg/jgUW656v2t')
            .setAuthor('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
            .setDescription('Firearm Search Results')
            .addFields(
              { name: `**Serial Number**`, value: `\`${results.firearms[i].firearm.serialNumber}\``, inline: true },
              { name: `**Type**`, value: `\`${results.firearms[i].firearm.weaponType}\``, inline: true },
              { name: `**Owner**`, value: `\`${results.firearms[i].firearm.registeredOwner}\``, inline: true },
            )
            // Other details
            let isStolen = results.firearms[i].firearm.isStolen;
            if (isStolen=="false"||isStolen==false) firearmResult.addFields({name:`**Stolen**`,value:'\`No\`',inline: true});
            if (isStolen=="true"||isStolen==true) firearmResult.addFields({name:`**Stolen**`,value:'\`Yes\`',inline: true});
            interaction.send(firearmResult);
          }
        }
        socket.disconnect();
      });
    },
  },
}