const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: "ping",
	description: "check the bots responce",
	usage: "",
	permissions: {
  	channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
  	member: [],
	},
  options: [],
  SlashCommand: {	
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
    	interaction.send({ content: 'Pong!' });
    },
  },
}