const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "channels",
  description: "View a list of allowed channels",
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
     * @param {import("discord.js").MessageCreate} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send(`You are not allowed to use the bot in this channel.`);
      }

      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      if (guild.server.hasCustomChannels==false) {
        return interaction.send('There are no channels set for the bot.');
      }

      let channels = ``;
      for (let i = 0; i < guild.server.allowedChannels.length; i++) {
        if (guild.server.allowedChannels[i] == undefined) break;
        if (channels.length==0) channels += `<#${guild.server.allowedChannels[i]}>`;
        else channels += `\n<#${guild.server.allowedChannels[i]}>`;
      }
      let channelsEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setDescription('**Allowed Channels to use the Bot**')
        .addFields(
          { name: `There are currently ${guild.server.allowedChannels.length} allowed channels.`, value: `${channels}`, inline: true },
        )
        .setFooter('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
      return interaction.send({ embeds: [channelsEmbed] });      
    },
  },
}