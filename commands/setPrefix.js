const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: "setprefix",
	description: "Update prefix for the bot",
	usage: "[new Prefix]",
	permissions: {
  	channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
  	member: ["MANAGE_GUILD"],
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
        return interaction.send({ content: `You are not allowed to use the bot in this channel.` });
      }
      if (args[0].length<1) return interaction.send({ content: 'Your new prefix must be \`1\` character!' })
	    client.dbo.collection("prefixes").updateOne({"server.serverID":GuildDB.serverID},{$set:{"server.prefix":args[0].value}},function(err, res) {
	      if (err) throw err;
	      interaction.send({ content: `The new prefix is now **\`${args[0].value}\`**` });
	    });
    },
  },
}