const { MessageEmbed } = require('discord.js');

module.exports = {
	name: "login",
	description: "Connect your Lines Police CAD account to Discord",
	usage: "",
	permissions: {
  	channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
  	member: [],
	},
	aliases: [],
	/**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message) => {
    return message.channel.send('Login from Lines Police CAD account management https://www.linespolice-cad.com/');
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
    	interaction.send('Login from Lines Police CAD account management https://www.linespolice-cad.com/');
    },
  },
}