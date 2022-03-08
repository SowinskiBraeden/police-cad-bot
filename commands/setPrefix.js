const { MessageEmbed } = require('discord.js');

module.exports = {
	name: "setprefix",
	description: "Update prefix for the bot",
	usage: "[new Prefix]",
	permissions: {
  	channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
  	member: ["MANAGE_GUILD"],
	},
	aliases: ["newprefix", "new_prefix", "set_prefix"],
	/**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args, { GuildDB }) => {
  	if (args[0]==undefined) return message.channel.send(`You must provide a \`new prefix\` ${message.author}`);
    if (args[0].length<1) return message.channel.send('Your new prefix must be \`1\` character!')
    client.dbo.collection("prefixes").updateOne({"server.serverID":GuildDB.serverID},{$set:{"server.prefix":args[0]}},function(err, res) {
      if (err) throw err;
      message.channel.send(`The new prefix is now **\`${args[0]}\`**`);
    });
  },
  SlashCommand: {
  	options: [
      {
        name: "new-prefix",
        description: "Update prefix for the bot",
        value: "setprefix",
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
      if (args[0].length<1) return interaction.send('Your new prefix must be \`1\` character!')
	    client.dbo.collection("prefixes").updateOne({"server.serverID":GuildDB.serverID},{$set:{"server.prefix":args[0].value}},function(err, res) {
	      if (err) throw err;
	      interaction.send(`The new prefix is now **\`${args[0].value}\`**`);
	    });
    },
  },
}