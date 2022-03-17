const { MessageEmbed } = require('discord.js');

module.exports = {
	name: "logout",
	description: "Disconnect your Lines Police CAD account from Discord",
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
    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You cannot logout if your not logged in.`);
    client.dbo.collection("users").updateOne({"user.discord.id":message.author.id},{$unset:{"user.discord":""}, $set:{"user.discordConnected":false}},function(err,res) {
      if (err) throw err;
      return message.channel.send(`Succesfully disconnected you Discord account.`);
    });
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
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send(`You cannot logout if your not logged in.`);
      client.dbo.collection("users").updateOne({"user.discord.id":interaction.member.user.id},{$unset:{"user.discord":""}, $set:{"user.discordConnected":false}},function(err,res) {
        if (err) throw err;
        return interaction.send(`Succesfully disconnected you Discord account.`);
      });
    },
  },
}