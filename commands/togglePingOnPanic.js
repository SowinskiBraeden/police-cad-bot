const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "togglepingonpanic",
  description: "Enable or Disable ping on panic",
  usage: "[true/false] [role]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: [],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").MessageCreate} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args) => {
    if (args.length==0) return message.channel.send(`You must provide a \`Ping On Role Status\` and a \`role\` to ping.`);  
    if (args[0]=="false") {
      // disable ping on panic and remove ping role
      client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.pingOnPanic":false,"server.pingRole":null}},function(err, res) {
        if (err) throw err;
        return message.channel.send(`Successfully disabled ping role on panic.`);
      });
    } else if (args[0]=="true") {
      if (!args[1]) return message.channel.send(`You must provide a \`role\` to ping .`);
      let roleid = args[1].replace('<@&', '').replace('>', '');
      let role = message.guild.roles.cache.find(x => x.id == roleid);
      if (role == undefined) {
        return message.channel.send(`Uh Oh! The role ${args[1]} connot be found.`);
      } else {
        client.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.pingRole":roleid,"server.pingOnPanic":true}},function(err, res) {
          if (err) throw err;
          return message.channel.send(`Successfully set ${args[1]} to be pinged on panic.`);
        });
      }
    } else return message.channel.send(`\`${args[0]}\` is an invalid status, use \`true\` or \`false\``);
  },
  SlashCommand: {
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
      }
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
      
      if (!args[0].value) {
        // disable ping on panic and remove ping role
        client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$set:{"server.pingOnPanic":false,"server.pingRole":null}},function(err, res) {
          if (err) throw err;
          return interaction.send(`Successfully disabled ping role on panic.`);
        });
      } else if (args[0].value) {
        let roleid = args[1].value;
        let role = interaction.guild.roles.cache.find(x => x.id == roleid);
        if (role == undefined) {
          return interaction.send(`Uh Oh! The role <@&${args[1].value}> connot be found.`);
        } else {
          client.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$set:{"server.pingRole":roleid,"server.pingOnPanic":true}},function(err, res) {
            if (err) throw err;
            return interaction.send(`Successfully set <@&${args[1].value}> to be pinged on panic.`);
          });
        }
      }
    },
  },
}