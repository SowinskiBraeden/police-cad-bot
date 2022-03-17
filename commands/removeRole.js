const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "removerole",
  description: "Remove a role allowed to use the bot",
  usage: "[role]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  aliases: ["remove_role"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").MessageCreate} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args) => {
    if (args.length==0) return message.channel.send(`You must provide a role.`);
    let roleid = args[0].replace('<@&', '').replace('>', '');
    let role = message.guild.roles.cache.find(x => x.id == roleid);
    if (role == undefined) {
      return message.channel.send(`Uh Oh! The role ${args[0]} connot be found.`);
    } else {
      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
      if (guild.server.hasCustomRoles==false) return message.channel.send(`There are no roles to be removed.`);
      if (!guild.server.allowedRoles.includes(roleid)) return message.channel.send(`The role ${args[0]} is not added to your roles.`);
      for (let i = 0; i < guild.server.allowedRoles.length; i++) {
        if (guild.server.allowedRoles[i]==roleid) {
          if ((guild.server.allowedRoles.length-1)==0) {
            client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":false}},function(err, res) {
              if (err) throw err;
              return message.channel.send(`Successfully removed ${args[0]} from allowed roles! There are no more allowed roles.`);
            });  
          } else if ((guild.server.allowedRoles.length-1)>0) {
            client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedRoles":roleid}},function(err, res) {
              if (err) throw err;
              return message.channel.send(`Successfully removed ${args[0]} from allowed roles.`);
            });
          }
        }
      }
    }
  },
  SlashCommand: {
    options: [
      {
        name: "role",
        description: "Role to remove from allowed roles",
        value: "role",
        type: 8,
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
      
      let roleid = args[0].value;
      let role = interaction.guild.roles.cache.find(x => x.id == roleid);
      if (role == undefined) {
        return interaction.send(`Uh Oh! The role <@&${args[0].value}> connot be found.`);
      } else {
        let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
        if (guild.server.hasCustomRoles==false) return interaction.send(`There are no roles to be removed.`);
        if (!guild.server.allowedRoles.includes(roleid)) return interaction.send(`The role <@&${args[0].value}> is not added to your roles.`);
        for (let i = 0; i < guild.server.allowedRoles.length; i++) {
          if (guild.server.allowedRoles[i]==roleid) {
            if ((guild.server.allowedRoles.length-1)==0) {
              client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":false}},function(err, res) {
                if (err) throw err;
                return interaction.send(`Successfully removed <@&${args[0].value}> from allowed roles! There are no more allowed roles.`);
              });  
            } else if ((guild.server.allowedRoles.length-1)>0) {
              client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedRoles":roleid}},function(err, res) {
                if (err) throw err;
                return interaction.send(`Successfully removed <@&${args[0].value}> from allowed roles.`);
              });
            }
          }
        }
      }
    },
  },
}