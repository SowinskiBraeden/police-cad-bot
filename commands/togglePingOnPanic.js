const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "togglepingonpanic",
  description: "Enable or Disable ping on panic",
  usage: "[true/false] [role]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "toggle",
      description: "Toggle ping on panic",
      value: "toggle",
      type: 5,
      required: true,
    },
    {
      name: "role",
      description: "Role to ping on panic",
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
      
      if (!args[0].value) {
        // disable ping on panic and remove ping role
        client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$set:{"server.pingOnPanic":false,"server.pingRole":null}},function(err, res) {
          if (err) throw err;
          return interaction.send({ content: `Successfully disabled ping role on panic.` });
        });
      } else if (args[0].value) {
        let roleid = args[1].value;
        let role = interaction.guild.roles.cache.find(x => x.id == roleid);
        if (role == undefined) {
          return interaction.send({ content: `Uh Oh! The role <@&${args[1].value}> connot be found.` });
        } else {
          client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$set:{"server.pingRole":roleid,"server.pingOnPanic":true}},function(err, res) {
            if (err) throw err;
            return interaction.send({ content: `Successfully set <@&${args[1].value}> to be pinged on panic.` });
          });
        }
      }
    },
  },
}