const { MessageEmbed } = require('discord.js');

module.exports = {
	name: "connect_account",
	description: "Connect your Discord Account to the Lines Police CAD Database",
	usage: "",
	permissions: {
  	channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
  	member: [],
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
    	return interaction.send('Login from Lines Police CAD account management https://www.linespolice-cad.com/');
    },
  },
}