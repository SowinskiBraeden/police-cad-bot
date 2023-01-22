module.exports = async (client, interaction) => {
  if (interaction.isCommand()) return;

  /*
    This file hanldes all button interactions from any command
  */

  let GuildDB = await client.GetGuild(interaction.guildId);
  const interactionName = interaction.customId.split('-')[0];
  let interactionHandler = client.interactionHandlers.get(interactionName);

  interactionHandler.run(client, interaction, GuildDB);
}