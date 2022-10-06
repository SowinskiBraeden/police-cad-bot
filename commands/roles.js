const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "roles",
  description: "View allowed roles",
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
     * @param {import("discord.js").MessageCreate} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(interaction.channel_id)) {
        return interaction.send({ content: `You are not allowed to use the bot in this channel.` });
      }

      let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":interaction.guild.id}).then(guild => guild);
      if (!client.exists(guild.server.hasCustomRoles) || !guild.server.hasCustomRoles) {
        return interaction.send({ content: 'There are no roles set for the bot.' });
      }

      let roles = ``;
      for (let i = 0; i < guild.server.allowedRoles.length; i++) {
        if (guild.server.allowedRoles[i] == undefined) break;
        let role = interaction.guild.roles.cache.find(r => r.id == guild.server.allowedRoles[i]);
        if (roles.length==0) roles += `@${role.name}`;
        else roles += `\n@${role.name}`;
      }
      let rolesEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setDescription('|**Allowed Roles to use the Bot**')
        .addFields(
          { name: `There are currently **${guild.server.allowedRoles.length}** allowed roles.`, value: `\`${roles}\``, inline: true },
        )
        .setFooter({ text: 'LPS Website Support', iconURL: client.config.IconURL, proxyIconURL: 'https://discord.gg/jgUW656v2t' })
      return interaction.send({ embeds: [rolesEmbed] });
    },
  },
}