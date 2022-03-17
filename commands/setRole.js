const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "setrole",
  description: "Add a role allowed to use the bot",
  usage: "[role]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  aliases: ["set_role", "addrole", "add_role"],
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
      if (client.exists(guild.server.allowedRoles)&&guild.server.allowedRoles.includes(roleid)) return message.channel.send(`The role ${args[0]} has already been added.`);
      client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$push:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":true}},function(err, res) {
        if (err) throw err;
        return message.channel.send(`Successfully added ${args[0]} to allowed roles.`);
      });
    }
  },
  SlashCommand: {
    options: [
      {
        name: "role",
        description: "Role to add to allowed roles",
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
        if (exists(guild.server.allowedRoles)&&guild.server.allowedRoles.includes(roleid)) return interaction.send(`The role <@&${args[0].value}> has already been added.`);
        client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$push:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":true}},function(err, res) {
          if (err) throw err;
          return interaction.send(`Successfully added <@&${args[0].value}> to allowed roles.`);
        });
      }
    },
  },
} 