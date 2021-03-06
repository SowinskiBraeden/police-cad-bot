const { MessageEmbed } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "namesearch",
  description: "Search a civilian",
  usage: "[First Name] [Last Name] [yyyy-mm-dd]",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: ["namedb", "name_search", "name_db"],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args, { GuildDB }) => {
    let useCommand = await client.verifyUseCommand(GuildDB.serverID, message.member.roles.cache, false);
    if (!useCommand) return message.channel.send("You don't have permission to use this command");

    if (GuildDB.customRoleStatus) {
      let userRoles = []; // TODO: get user roles
      let hasRole = await client.hasRole(userRoles, GuildDB.serverID);
      if (!hasRole) return message.channel.send(`You don't have permission to use this command.`);
    }

    let user = await client.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in.`);
    if (args.length==0) return message.channel.send(`You must provide a \`First Name\`, \`Last Name\` and \`DOB\`(yyyy-mm-dd).`);
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
    socket.on("bot_name_search_results", results => {

      if (results.user._id==user._id) {
        if (results.civilians.length == 0) {
          return message.channel.send(`Name \`${args[0]} ${args[1]}\` not found ${message.author}`);
        }

        for (let i = 0; i < results.civilians.length; i++) {
          // Get Drivers Licence Status
          let licenceStatus;
          if (results.civilians[i].civilian.licenseStatus == 1) licenceStatus = 'Valid';
          if (results.civilians[i].civilian.licenceStatus == 2) licenceStatus = 'Revoked';
          if (results.civilians[i].civilian.licenceStatus == 3) licenceStatus = 'None';
          // Get Firearm Licence Status
          let firearmLicence = results.civilians[i].civilian.firearmLicense;
          if (firearmLicence == undefined || firearmLicence == null) firearmLicence = 'None';
          if (firearmLicence == '2') firearmLicence = 'Valid';
          if (firearmLicence == '3') firearmLicence = 'Revoked';
          let nameResult = new MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.civilians[i].civilian.firstName} ${results.civilians[i].civilian.lastName} | ${results.civilians[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
          .setDescription('Name Search Results')
          .addFields(
            { name: `**First Name**`, value: `\`${results.civilians[i].civilian.firstName}\``, inline: true },
            { name: `**Last Name**`, value: `\`${results.civilians[i].civilian.lastName}\``, inline: true },
            { name: `**DOB**`, value: `\`${results.civilians[i].civilian.birthday}\``, inline: true },
            { name: `**Drivers License**`, value: `\`${licenceStatus}\``, inline: true },
            { name: `**Firearm Licence**`, value: `\`${firearmLicence}\``, inline: true },
            { name: `**Gender**`, value: `\`${results.civilians[i].civilian.gender}\``, inline: true }
          )
          // Check Other details
          let address = results.civilians[i].civilian.address;
          let occupation = results.civilians[i].civilian.occupation;
          let height = results.civilians[i].civilian.height;
          let weight = results.civilians[i].civilian.weight;
          let eyeColor = results.civilians[i].civilian.eyeColor;
          let hairColor = results.civilians[i].civilian.hairColor;
          if (address != null && address != undefined && address != '') nameResult.addFields({ name: `**Address**`, value: `\`${address}\``, inline: true });
          if (occupation != null && occupation != undefined && occupation != '') nameResult.addFields({ name: `**Occupation**`, value: `\`${occupation}\``, inline: true });
          if (height!=null&&height!=undefined&&height!="NaN"&&height!='') {
            if (results.civilians[i].civilian.heightClassification=='imperial') {
              let ft = Math.floor(height/12);
              let inch = height%12;
              nameResult.addFields({ name: '**Height**', value: `\`${ft}'${inch}"\``, inline: true });
            } else {
              nameResult.addFields({ name: '**Height**', value: `\`${height}cm\``, inline: true });
            }
          }
          if (weight!=null&&weight!=undefined&&weight!='') {
            if (results.civilians[i].civilian.weightClassification=='imperial') {
              nameResult.addFields({ name: '**Weight**', value: `\`${weight}lbs.\``, inline: true });
            } else {
              nameResult.addFields({ name: '**Weight**', value: `\`${weight}kgs.\``, inline: true });
            } 
          }
          if (eyeColor!=null&&eyeColor!=undefined&&eyeColor!='') nameResult.addFields({name:'**Eye Color**',value:`\`${eyeColor}\``,inline:true});
          if (hairColor!=null&&hairColor!=undefined&&hairColor!='') nameResult.addFields({name:'**Hair Color**',value:`\`${hairColor}\``,inline:true});
          nameResult.addFields({name:'**Organ Donor**',value:`\`${results.civilians[i].civilian.organDonor}\``,inline:true});
          nameResult.addFields({name:'**Veteran**',value:`\`${results.civilians[i].civilian.veteran}\``,inline:true});
          message.channel.send({ embeds: [nameResult] });
        }
      }
      socket.disconnect();
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

      let useCommand = await client.verifyUseCommand(GuildDB.serverID, interaction.member.roles, true);
      if (!useCommand) return interaction.send("You don't have permission to use this command");
      
      let user = await client.dbo.collection("users").findOne({"user.discord.id":interaction.member.user.id}).then(user => user);
      if (!user) return interaction.send(`You are not logged in.`);
      let data;

      data = {
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
      socket.on("bot_name_search_results", results => {

        if (results.user._id==user._id) {
          if (results.civilians.length == 0) {
            return interaction.send(`Name \`${args[0].value} ${args[1].value}\` not found.`);
          }

          for (let i = 0; i < results.civilians.length; i++) {
            // Get Drivers Licence Status
            let licenceStatus;
            if (results.civilians[i].civilian.licenseStatus == 1) licenceStatus = 'Valid';
            if (results.civilians[i].civilian.licenceStatus == 2) licenceStatus = 'Revoked';
            if (results.civilians[i].civilian.licenceStatus == 3) licenceStatus = 'None';
            // Get Firearm Licence Status
            let firearmLicence = results.civilians[i].civilian.firearmLicense;
            if (firearmLicence == undefined || firearmLicence == null) firearmLicence = 'None';
            if (firearmLicence == '2') firearmLicence = 'Valid';
            if (firearmLicence == '3') firearmLicence = 'Revoked';
            let nameResult = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`**${results.civilians[i].civilian.firstName} ${results.civilians[i].civilian.lastName} | ${results.civilians[i]._id}**`)
            .setURL('https://discord.gg/jgUW656v2t')
            .setAuthor('LPS Website Support', client.config.IconURL, 'https://discord.gg/jgUW656v2t')
            .setDescription('Name Search Results')
            .addFields(
              { name: `**First Name**`, value: `\`${results.civilians[i].civilian.firstName}\``, inline: true },
              { name: `**Last Name**`, value: `\`${results.civilians[i].civilian.lastName}\``, inline: true },
              { name: `**DOB**`, value: `\`${results.civilians[i].civilian.birthday}\``, inline: true },
              { name: `**Drivers License**`, value: `\`${licenceStatus}\``, inline: true },
              { name: `**Firearm Licence**`, value: `\`${firearmLicence}\``, inline: true },
              { name: `**Gender**`, value: `\`${results.civilians[i].civilian.gender}\``, inline: true }
            )
            // Check Other details
            let address = results.civilians[i].civilian.address;
            let occupation = results.civilians[i].civilian.occupation;
            let height = results.civilians[i].civilian.height;
            let weight = results.civilians[i].civilian.weight;
            let eyeColor = results.civilians[i].civilian.eyeColor;
            let hairColor = results.civilians[i].civilian.hairColor;
            if (address != null && address != undefined && address != '') nameResult.addFields({ name: `**Address**`, value: `\`${address}\``, inline: true });
            if (occupation != null && occupation != undefined && occupation != '') nameResult.addFields({ name: `**Occupation**`, value: `\`${occupation}\``, inline: true });
            if (height!=null&&height!=undefined&&height!="NaN"&&height!='') {
              if (results.civilians[i].civilian.heightClassification=='imperial') {
                let ft = Math.floor(height/12);
                let inch = height%12;
                nameResult.addFields({ name: '**Height**', value: `\`${ft}'${inch}"\``, inline: true });
              } else {
                nameResult.addFields({ name: '**Height**', value: `\`${height}cm\``, inline: true });
              }
            }
            if (weight!=null&&weight!=undefined&&weight!='') {
              if (results.civilians[i].civilian.weightClassification=='imperial') {
                nameResult.addFields({ name: '**Weight**', value: `\`${weight}lbs.\``, inline: true });
              } else {
                nameResult.addFields({ name: '**Weight**', value: `\`${weight}kgs.\``, inline: true });
              } 
            }
            if (eyeColor!=null&&eyeColor!=undefined&&eyeColor!='') nameResult.addFields({name:'**Eye Color**',value:`\`${eyeColor}\``,inline:true});
            if (hairColor!=null&&hairColor!=undefined&&hairColor!='') nameResult.addFields({name:'**Hair Color**',value:`\`${hairColor}\``,inline:true});
            nameResult.addFields({name:'**Organ Donor**',value:`\`${results.civilians[i].civilian.organDonor}\``,inline:true});
            nameResult.addFields({name:'**Veteran**',value:`\`${results.civilians[i].civilian.veteran}\``,inline:true});
            interaction.send(nameResult);
          }
        }
        socket.disconnect();
      });
    },
  },
}