const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "updatelicense",
  description: "Update Drivers License Status",
  usage: "[firstName] [lastName] [DOB]",
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
  run: async (client, message, args) => {
    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in.`);
    if (args.length==0) return message.channel.send(`You must provide a \`First Name\`, \`Last Name\`, \`DOB\`(yyyy-mm-dd).`);
    if (args.length==1) return message.channel.send(`You're missing a \`Last Name\` and \`DOB\`(yyyy-mm-dd).`);
    if (args.length==2) return message.channel.send(`You're missing a \`DOB\`(yyyy-mm-dd).`);
  
    let data = {
      user: user,
      query: {
        firstName: args[0],
        lastName: args[1],
        dateOfBirth: args[2],
        activeCommunityID: user.user.activeCommunity
      }
    }
    
    const socket = io.connect(client.config.socket);
    socket.emit("bot_name_search", data);
    socket.on("bot_name_search_results", (results) => {
      if (results.user._id==user._id) {
        if (results.civilians.length == 0) {
          return message.channel.send(`Name \`${args[0]} ${args[1]}\` not found.`);
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
        nameResult = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.civilians[i].civilian.firstName} ${results.civilians[i].civilian.lastName} | ${results.civilians[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
          .setDescription('Name Search Results')
          .addFields(
            { name: `**First Name**`, value: `\`${results.civilians[i].civilian.firstName}\``, inline: true },
            { name: `**Last Name**`, value: `\`${results.civilians[i].civilian.lastName}\``, inline: true },
            { name: `**DOB**`, value: `\`${results.civilians[i].civilian.birthday}\``, inline: true },
            { name: `**Drivers License**`, value: `\`${licenseStatus}\``, inline: true },
            { name: `**Gender**`, value: `\`${results.civilians[i].civilian.gender}\``, inline: true }
          )
        row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId(`license-revoke-${results.civilians[i]._id}`)
              .setLabel("Revoke")
              .setStyle("DANGER"),
            new MessageButton()
              .setCustomId(`license-reinstate-${results.civilians[i]._id}`)
              .setLabel("Reinstate")
              .setStyle("SUCCESS")
          )
      }

      message.channel.send({ embeds: [nameResult], components: [row] });

      const filter = i => {
        return i.user.id == message.author.id;
      }

      const collector = message.channel.createMessageComponentCollector({
        filter,
        max: 1,
        time: 20000
      });

      collector.on('collect', async ButtonInteraction => {
        const socket = io.connect(client.config.socket);

          let queryString = ButtonInteraction.customId;
          let query = {
            _id: "",
            status: null,
            bot_request: true
          };
          if (queryString.substr(8, 6)=='revoke') {
            query.status = 2;
            query._id = queryString.substr(15, 24);
          } else if (queryString.substr(8, 9)=='reinstate') {
            query.status = 1;
            query._id = queryString.substr(18, 24);
          }
          socket.emit("update_drivers_license_status", query);
          socket.on("bot_updated_drivers_license_status", (res) => {
            if (!res.success) ButtonInteraction.update({ content: 'Failed to update license.', embeds: [], components: [] });
            socket.disconnect();
          });
          return ButtonInteraction.update({ content: 'Successfully updated license.', embeds: [], components: [] });
      });
    });
  },
  SlashCommand: {
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
      if (!user) return interaction.send(`You are not logged in.`);
      
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
            return interaction.send(`Name \`${args[0].value} ${args[1].value}\` not found.`);
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
          nameResult = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`**${results.civilians[i].civilian.firstName} ${results.civilians[i].civilian.lastName} | ${results.civilians[i]._id}**`)
            .setURL('https://discord.gg/jgUW656v2t')
            .setAuthor('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
            .setDescription('Name Search Results')
            .addFields(
              { name: `**First Name**`, value: `\`${results.civilians[i].civilian.firstName}\``, inline: true },
              { name: `**Last Name**`, value: `\`${results.civilians[i].civilian.lastName}\``, inline: true },
              { name: `**DOB**`, value: `\`${results.civilians[i].civilian.birthday}\``, inline: true },
              { name: `**Drivers License**`, value: `\`${licenseStatus}\``, inline: true },
              { name: `**Gender**`, value: `\`${results.civilians[i].civilian.gender}\``, inline: true }
            )
          row = new MessageActionRow()
            .addComponents(
              new MessageButton()
                .setCustomId(`license-revoke-${results.civilians[i]._id}`)
                .setLabel("Revoke")
                .setStyle("DANGER"),
              new MessageButton()
                .setCustomId(`license-reinstate-${results.civilians[i]._id}`)
                .setLabel("Reinstate")
                .setStyle("SUCCESS")
            )
        }

        interaction.send({ embeds: [nameResult], components: [row] });

        client.on("interactionCreate", ButtonInteraction => {
          const socket = io.connect(client.config.socket);

          let queryString = ButtonInteraction.customId;
          let query = {
            _id: "",
            status: null,
            bot_request: true
          };
          if (queryString.substr(8, 6)=='revoke') {
            query.status = 2;
            query._id = queryString.substr(15, 24);
          } else if (queryString.substr(8, 9)=='reinstate') {
            query.status = 1;
            query._id = queryString.substr(18, 24);
          }
          socket.emit("update_drivers_license_status", query);
          socket.on("bot_updated_drivers_license_status", (res) => {
            if (!res.success) ButtonInteraction.update({ content: 'Failed to update license.', embeds: [], components: [] });
            socket.disconnect();
          });
          return ButtonInteraction.update({ content: 'Successfully updated license.', embeds: [], components: [] });
        });
      });
    },
  },
}