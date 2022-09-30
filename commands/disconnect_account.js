const { EmbedBuilder } = require('discord.js');

module.exports = {
	name: "disconnect_account",
	description: "Disconnect your Discord account from the Lines Police CAD Database",
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
      if (!user) return interaction.send({ content: `You cannot logout if your not logged in.` });
      client.dbo.collection("users").updateOne({"user.discord.id":interaction.member.user.id},{$unset:{"user.discord":""}, $set:{"user.discordConnected":false}},function(err,res) {
        if (err) throw err;
        return interaction.send({ content: `Succesfully disconnected you Discord account.` });
      });
    },
  },
}