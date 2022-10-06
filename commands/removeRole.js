const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "removerole",
  description: "Remove a role allowed to use the bot",
  usage: "[role]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: ["MANAGE_GUILD"],
  },
  options: [
    {
      name: "role",
      description: "Role to remove from allowed roles",
      value: "role",
      type: 8,
      required: true,
    },
  ],  
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
      
      let roleid = args[0].value;
      let role = interaction.guild.roles.cache.find(x => x.id == roleid);
      if (role == undefined) {
        return interaction.send({ content: `Uh Oh! The role <@&${args[0].value}> connot be found.` });
      } else {
        let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
        if (!client.exists(guild.server.hasCustomRoles) || !guild.server.hasCustomRoles) return interaction.send({ content: `There are no roles to be removed.` });
        if (!guild.server.allowedRoles.includes(roleid)) return interaction.send({ content: `The role <@&${args[0].value}> is not added to your roles.` });
        for (let i = 0; i < guild.server.allowedRoles.length; i++) {
          if (guild.server.allowedRoles[i]==roleid) {
            if ((guild.server.allowedRoles.length-1)==0) {
              client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":false}},function(err, res) {
                if (err) throw err;
                return interaction.send({ content: `Successfully removed <@&${args[0].value}> from allowed roles! There are no more allowed roles.` });
              });  
            } else if ((guild.server.allowedRoles.length-1)>0) {
              client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedRoles":roleid}},function(err, res) {
                if (err) throw err;
                return interaction.send({ content: `Successfully removed <@&${args[0].value}> from allowed roles.` });
              });
            }
          }
        }
      }
    },
  },
}