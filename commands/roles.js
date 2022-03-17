const { MessageEmbed } = require('discord.js');

module.exports = {
  name: "roles",
  description: "View allowed roles",
  usage: "",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: [],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").MessageCreate} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message) => {
    let guild = await client.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.hasCustomRoles==false) {
      return message.channel.send('There are no roles set for the bot.');
    }

    let roles = ``;
    for (let i = 0; i < guild.server.allowedRoles.length; i++) {
      if (guild.server.allowedRoles[i] == undefined) break;
      let role = message.guild.roles.cache.find(r => r.id == guild.server.allowedRoles[i]);
      if (roles.length==0) roles += `@${role.name}`;
      else roles += `\n@${role.name}`;
    }
    let rolesEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setDescription('**Allowed Roles to use the Bot**')
      .addFields(
        { name: `There are currently ${guild.server.allowedRoles.length} allowed roles.`, value: `\`${roles}\``, inline: true },
      )
      .setFooter('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
    return message.channel.send({ embeds: [rolesEmbed] });
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
      if (guild.server.hasCustomRoles==false) {
        return interaction.send('There are no roles set for the bot.');
      }

      let roles = ``;
      for (let i = 0; i < guild.server.allowedRoles.length; i++) {
        if (guild.server.allowedRoles[i] == undefined) break;
        let role = interaction.guild.roles.cache.find(r => r.id == guild.server.allowedRoles[i]);
        if (roles.length==0) roles += `@${role.name}`;
        else roles += `\n@${role.name}`;
      }
      let rolesEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setDescription('|**Allowed Roles to use the Bot**')
        .addFields(
          { name: `There are currently **${guild.server.allowedRoles.length}** allowed roles.`, value: `\`${roles}\``, inline: true },
        )
        .setFooter('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
      return interaction.send({ embeds: [rolesEmbed] });
    },
  },
}