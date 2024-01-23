const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "updatelicense",
  description: "Update Drivers License Status",
  usage: "[firstName] [lastName] [DOB]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  options: [
    {
      name: "firstname",
      description: "Civilian's First Name",
      value: "firstname",
      type: 3,
      required: true,
    },
    {
      name: "lastname",
      description: "Civilian's Last Name",
      value: "lastname",
      type: 3,
      required: true,
    },
    {
      name: "dob",
      description: "Civilian's DOB (yyyy-mm-dd)",
      value: "dob",
      type: 3,
      required: true,
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

      let useCommand = await client.verifyUseCommand(GuildDB.serverID, interaction.member.roles);
      if (!useCommand) return interaction.send({ content: "You don't have permission to use this command" });
      
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send({ content: `You are not logged in.` });
      
      let data = {
        user: user,
        query: {
          firstName: args[0].value,
          lastName: args[1].value,
          dateOfBirth: args[2].value,
          activeCommunityID: user.user.activeCommunity
        }
      }
      
      const socket = io.connect(client.config.socket);
      socket.emit("bot_name_search", data);
      socket.on("bot_name_search_results", (results) => {
        if (results.user._id==user._id) {
          if (results.civilians.length == 0) {
            return interaction.send({ content: `Name \`${args[0].value} ${args[1].value}\` not found.` });
          }
        }

        let nameResult;
        let row;
        for (let i = 0; i < results.civilians.length; i++) {
          // Get Drivers Licence Status
          let licenseStatus;
          if (results.civilians[i].civilian.licenseStatus == 1) licenseStatus = 'Valid';
          if (results.civilians[i].civilian.licenseStatus == 2) licenseStatus = 'Revoked';
          if (results.civilians[i].civilian.licenseStatus == 3) licenseStatus = 'None';
          nameResult = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`**${results.civilians[i].civilian.firstName} ${results.civilians[i].civilian.lastName} | ${results.civilians[i]._id}**`)
            .setURL('https://discord.gg/jgUW656v2t')
            .setAuthor({ name: 'LPS Website Support', iconURL: client.config.IconURL, url: 'https://discord.gg/jgUW656v2t' })
            .setDescription('Name Search Results')
            .addFields(
              { name: `**First Name**`, value: `\`${results.civilians[i].civilian.firstName}\``, inline: true },
              { name: `**Last Name**`, value: `\`${results.civilians[i].civilian.lastName}\``, inline: true },
              { name: `**DOB**`, value: `\`${results.civilians[i].civilian.birthday}\``, inline: true },
              { name: `**Drivers License**`, value: `\`${licenseStatus}\``, inline: true },
              { name: `**Gender**`, value: `\`${results.civilians[i].civilian.gender}\``, inline: true }
            )
          row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`license-revoke-${results.civilians[i]._id}`)
                .setLabel("Revoke")
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(`license-reinstate-${results.civilians[i]._id}`)
                .setLabel("Reinstate")
                .setStyle(ButtonStyle.Success)
            )
        }

        return interaction.send({ embeds: [nameResult], components: [row], flags: (1 << 6) });
      });
    },
  },
  Interactions: {
    license: {
      run: async (client, ButtonInteraction, { GuildDB }) => {
        const socket = io.connect(client.config.socket);

          let queryString = ButtonInteraction.customId;
          let query = {
            _id: "",
            status: null,
            bot_request: true
          };
          if (queryString.split('-')[1]=='revoke') {
            query.status = 2;
            query._id = queryString.split('-')[2];
          } else if (queryString.split('-')[1]=='reinstate') {
            query.status = 1;
            query._id = queryString.split('-')[2];
          }
          socket.emit("update_drivers_license_status", query);
          socket.on("bot_updated_drivers_license_status", (res) => {
            socket.disconnect();
            if (!res.success) return ButtonInteraction.update({ content: 'Failed to update license.', embeds: [], components: [] });
          });
          return ButtonInteraction.update({ content: 'Successfully updated license.', embeds: [], components: [] });
      }
    }
  }
}