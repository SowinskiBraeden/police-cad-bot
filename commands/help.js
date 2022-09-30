const { EmbedBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "help",
  description: "Get information on a specific command",
  usage: "[command]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "command",
      description: "Get information on a specific command",
      value: "command",
      type: 3,
      required: false,
    },
  ],
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
      let Commands = client.commands.filter((cmd) => {
        if (client.exists(cmd.debug)) return !cmd.debug
        else return true
      }).map((cmd) => 
          `\`/${cmd.name}${cmd.usage ? " " + cmd.usage : ""}\` - ${cmd.description}`
      );

      let Embed = new EmbedBuilder()
        .setColor(client.config.EmbedColor)
        .setDescription(`${Commands.join("\n")}
  
    LPC Bot Version: v${client.config.Version}`);
      if (!args) return interaction.send({ embeds: [Embed] });
      else {
        let cmd =
          client.commands.get(args[0].value) ||
          client.commands.find(
            (x) => x.aliases && x.aliases.includes(args[0].value)
          );
        if (!cmd)
          return client.sendTime(
            interaction,
            `❌ | Unable to find that command.`
          );

        let embed = new EmbedBuilder()
          .setAuthor({ name: `Command: ${cmd.name}`, iconURL: client.config.IconURL })
          .setDescription(cmd.description)
          .setColor(ButtonStyle.Success) // Green
          .addFields({
            name: "Usage",
            value: `\`/${cmd.name}${cmd.usage ? " " + cmd.usage : ""}\``,
            inline: true
          })
          .addFields({
            name: "Permissions",
            value: "Member: " +
              cmd.permissions.member.join(", ") +
              "\nBot: " +
              cmd.permissions.channel.join(", "),
            inline: true
          })

        return interaction.send({ embeds: [embed] });
      }
    },
  },
};