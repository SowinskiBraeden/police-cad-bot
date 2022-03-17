/**
 *
 * @param {require("../structures/LinesPoliceCadBot")} client
 * @param {require("discord.js").message} message
 * @returns {void} or nothing if you didn't know
 */

module.exports = async (client, message) => {
  if (message.author.bot || message.channel.type === "dm") return;
  let prefix = client.config.DefaultPrefix;

  let GuildDB = await client.GetGuild(message.guild.id);
  if (GuildDB && GuildDB.prefix) prefix = GuildDB.prefix;

  //Prefixes also have mention match
  const prefixMention = new RegExp(`^<@!?${client.user.id}> `);
  prefix = message.content.match(prefixMention)
    ? message.content.match(prefixMention)[0]
    : prefix;

  if (message.content.indexOf(prefix) !== 0) return;

  if (GuildDB.customChannelStatus==true&&!GuildDB.allowedChannels.includes(message.channel.id)) {
    return message.channel.send(`You are not allowed to use the bot in this channel.`);
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  //Making the command lowerCase because our file name will be in lowerCase
  const command = args.shift().toLowerCase();

  //Searching a command
  const cmd =
    client.commands.get(command) ||
    client.commands.find((x) => x.aliases && x.aliases.includes(command));

  //Executing the codes when we get the command or aliases
  if (cmd) {
    if (
      (cmd.permissions &&
        cmd.permissions.channel &&
        !message.channel
          .permissionsFor(client.user)
          .has(cmd.permissions.channel)) ||
      (cmd.permissions &&
        cmd.permissions.member &&
        !message.channel
          .permissionsFor(message.member)
          .has(cmd.permissions.member))
    )
      return client.sendError(
        message.channel,
        "Missing Permissions!" + GuildDB.DJ
          ? " You need the correct role to access this command."
          : ""
      );
    cmd.run(client, message, args, { GuildDB });
    client.CommandsRan++;
  } else return;
};