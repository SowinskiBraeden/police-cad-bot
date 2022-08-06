const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "help",
  description: "Get information on a specific command",
  usage: "[command]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  SlashCommand: {
    options: [
      {
        name: "command",
        description: "Get information on a specific command",
        value: "command",
        type: 3,
        required: false,
      },
    ],
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
      let Commands = client.commands.filter((cmd) => {
        if (client.exists(cmd.debug)) return !cmd.debug
        else return true
      }).map((cmd) => 
          `\`/${cmd.name}${cmd.usage ? " " + cmd.usage : ""}\` - ${cmd.description}`
      );

      let Embed = new MessageEmbed()
        .setColor(client.config.EmbedColor)
        .setDescription(`${Commands.join("\n")}
  
    LPC Bot Version: v${client.config.Version}`);
      if (!args) return interaction.send(Embed);
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

        let embed = new MessageEmbed()
          .setAuthor(`Command: ${cmd.name}`, client.config.IconURL)
          .setDescription(cmd.description)
          .setColor("GREEN")
          .addField(
            "Usage",
            `\`/${cmd.name}${cmd.usage ? " " + cmd.usage : ""}\``,
            true
          )
          .addField(
            "Permissions",
            "Member: " +
              cmd.permissions.member.join(", ") +
              "\nBot: " +
              cmd.permissions.channel.join(", "),
            true
          )

        return interaction.send(embed);
      }
    },
  },
};