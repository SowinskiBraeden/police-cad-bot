const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: "account",
	description: "View connected Lines Police CAD account",
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
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (user==null) return interaction.send({ content: `You are not logged in.` });
      client.users.fetch(interaction.member.user.id)
        .then(duser => duser.send(`<@${interaction.member.user.id}> Logged in as **${user.user.username}**  |  **${user.user.email}**`).catch(err => {client.log(err)}))
        .catch(err => {client.log(err)});
      return interaction.send({ content: 'Your account details have been sent in your dm.' });
    },
  },
}