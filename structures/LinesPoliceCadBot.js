const { Collection, Client, MessageEmbed } = require('discord.js');
const CommandHandler =  require('../commands').Commands;
const MongoClient = require('mongodb').MongoClient;
const Logger = require("../util/Logger");
const path = require("path");
const fs = require('fs');

class LinesPoliceCadBot extends Client {

  constructor(config) {
    super()

    this.config = config;
    this.commands = new Collection();
    this.logger = new Logger(path.join(__dirname, "..", "logs/Logs.log"));

    if (this.config.Token === "")
    return new TypeError(
      "The botconfig.js is not filled out. Please make sure nothing is blank, otherwise the bot will not work properly."
    );

    this.db;
    this.dbo;
    this.connectMongo(this.config.mongoURI, this.config.dbo);
    this.LoadCommands();
    this.LoadEvents();

    this.Ready = false;

    this.ws.on("INTERACTION_CREATE", async (interaction) => {
      client.log("Interaction")
      let GuildDB = await this.GetGuild(interaction.guild_id);

      //Initialize GuildDB
      if (!GuildDB) {
        await this.database.guild.set(interaction.guild_id, {
          prefix: this.config.DefaultPrefix,
          DJ: null,
        });
        GuildDB = await this.GetGuild(interaction.guild_id);
      }

      const command = interaction.data.name.toLowerCase();
      const args = interaction.data.options;

      //Easy to send respnose so ;)
      interaction.guild = await this.guilds.fetch(interaction.guild_id);
      interaction.send = async (message) => {
        return await this.api
          .interactions(interaction.id, interaction.token)
          .callback.post({
            data: {
              type: 4,
              data:
                typeof message == "string"
                  ? { content: message }
                  : message.type && message.type === "rich"
                  ? { embeds: [message] }
                  : message,
            },
          });
      };

      let cmd = client.commands.get(command);
      if (cmd.SlashCommand && cmd.SlashCommand.run)
        cmd.SlashCommand.run(this, interaction, args, { GuildDB });
    });

    const client = this;
  }

  async connectMongo(mongoURI, dbo) {
    this.db = await MongoClient.connect(mongoURI,{useUnifiedTopology:true});
    this.dbo = this.db.db(dbo);
    this.log('Successfully connected to mongoDB');
  }

  LoadCommands() {
    let CommandsDir = path.join(__dirname, '..', 'commands');
    fs.readdir(CommandsDir, (err, files) => {
      if (err) this.log(err);
      else
        files.forEach((file) => {
          let cmd = require(CommandsDir + "/" + file);
          if (!cmd.name || !cmd.description || !cmd.run)
            return this.log(
              "Unable to load Command: " +
                file.split(".")[0] +
                ", Reason: File doesn't had run/name/desciption"
            );
          this.commands.set(file.split(".")[0].toLowerCase(), cmd);
          this.log("Command Loaded: " + file.split(".")[0]);
        });
    });
  }

  LoadEvents() {
    let EventsDir = path.join(__dirname, '..', 'events');
    fs.readdir(EventsDir, (err, files) => {
      if (err) this.log(err);
      else
        files.forEach((file) => {
          const event = require(EventsDir + "/" + file);
          this.on(file.split(".")[0], event.bind(null, this));
          this.logger.log("Event Loaded: " + file.split(".")[0]);
        });
    });
  }

  sendTime(Channel, Error) {
    let embed = new MessageEmbed()
      .setColor(this.config.EmbedColor)
      .setDescription(Error);

    Channel.send(embed);
  }

  RegisterSlashCommands() {
    this.guilds.cache.forEach((guild) => {
      require("../util/RegisterSlashCommands")(this, guild.id);
    });
  }

  async checkRoleStatus(message) {
    let hasRole = false;
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    // If user has one of any in the list of allowed roles, hasRole is true
    for (let i = 0; i < guild.server.allowedRoles.length; i++) {
      if (message.member.roles.cache.some(role => role.id == guild.server.allowedRoles[i])) hasRole = true;
    }
    return hasRole;
  }

  async GetGuild(GuildId) {
    let prefix;
    let customRoleStatus;
    let customChannelStatus;
    let allowedChannels;
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":GuildId}).then(guild => guild);

      // If guild not found, generate guild default
      if (!guild) {
        let newGuild = {
          server: {
            serverID: GuildId,
            prefix: this.config.DefaultPrefix,
            hasCustomRoles: false,
            hasCustomChannels: false,
          }
        }
        this.dbo.collection("prefixes").insertOne(newGuild, function(err, res) {
          if (err) throw err;
        });
        prefix = newGuild.server.prefix;
        customRoleStatus = newGuild.server.hasCustomRoles;
        customChannelStatus = newGuild.server.hasCustomChannels;
        allowedChannels = null;
      } else {
        prefix = guild.server.prefix;
        customRoleStatus = guild.server.hasCustomRoles;
        customChannelStatus = guild.server.hasCustomChannels;
        if (guild.server.allowedChannels!=undefined||guild.server.allowedChannels!=null&&guild.server.allowedChannels.length>0) {
          allowedChannels = guild.server.allowedChannels;
        } else allowedChannels = null;
      }
    let guildData = {
      prefix: prefix,
      allowedChannels: allowedChannels,
      customRoleStatus: customRoleStatus,
      customChannelStatus: customChannelStatus,
      serverID: GuildId
    }
    return guildData;
  }

  log(Text) {
    this.logger.log(Text);
  }

  sendError(Channel, Error) {
    let embed = new MessageEmbed()
      .setTitle("An error occured")
      .setColor("RED")
      .setDescription(Error)
      .setFooter(
        "If you think this as a bug, please report it in the support server!"
      );

    Channel.send(embed);
  }


  build() {
    this.login(this.config.Token);
  }

  // main() {
  //   client.on('ready', () => {
  //     console.log(`Logged in as ${client.user.tag}`);
  //   });

  //   // Basic Commands
  //   client.on('message', async (message) => {
  //     let { prefix, channelId, customRoleStatus, customChannelStatus, allowedChannels } = await this.getGuildPresets(message);
  //     if (!message.content.startsWith(prefix) || message.author.bot) return;

  //     if (customChannelStatus==true&&!allowedChannels.includes(message.channel.id)) {
  //       return message.channel.send(`This is not the preferred channel, please one of the allowed channels. Use \`${prefix}channels\` to see a list of allowed channels ${message.author}`);
  //     }
  //     const args = message.content.slice(prefix.length).trim().split(' ');
  //     const command = args.shift().toLowerCase();

  //     // Valid Statuses Embed
  //     const validStatus = new MessageEmbed()
  //       .setColor('#0099ff')
  //       .setTitle('Lines Police CAD')
  //       .setURL('https://www.linespolice-cad.com/')
  //       .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
  //       .setDescription('Valid Statuses')
  //       .addFields(
  //         { name: 'Statuses:', value: `
  //           10-8   |  \`On Duty\`
  //           10-7   |  \`Off Duty\`
  //           10-6   |  \`Busy\`
  //           10-11  |  \`Traffic Stop\`
  //           10-23  |  \`Arrive on Scene\`
  //           10-97  |  \`In Route\`
  //           10-15  |  \`Subject in Custody\`
  //           10-70  |  \`Foot Pursuit\`
  //           10-80  |  \`Vehicle Pursiut\`
  //           `
  //         }    
  //       )

  //     // Help Embed
  //     const help = new MessageEmbed()
  //       .setColor('#0099ff')
  //       .setTitle('**Commands:**')
  //       .setURL('https://discord.gg/w2g2FFmHbF')
  //       .setAuthor('LPS Website & Bot Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
  //       .setDescription('Lines Police CAD Bot Commands')
  //       .addFields({
  //         name: `**__Bot Commands:__**`,
  //         value: `
  //         **${prefix}help** - \`Displays this help page\`
  //         **${prefix}stats** - \`Displays current Bot statistics\`
  //         **${prefix}ping** - \`Responds with Pong to check Bot responce\`
  //         `,
  //         inline: false
  //       },
  //       {
  //         name: `**__LPC Commands (1/2):__**`,
  //         value: `
  //         **${prefix}login** - \`Redirects you to connect your discord to LPC(DM only)\`
  //         **${prefix}logout** - \`Logs out of your current logged in account\`
  //         **${prefix}validStatus** - \`Shows list of valid statuses to updade to\`
  //         **${prefix}checkStatus** <user> - \`Check your own or other status\`
  //         **${prefix}updateStatus** <status> - \`Updates your status\`
  //         **${prefix}account** - \`returns logged in account\`
  //         **${prefix}penalCodes** - \`Provides Link to penal codes\`
  //         **${prefix}namedb** <firstName> <lastName> <dob> - \`Searches for Civilian by Name\`
  //         **${prefix}platedb** <licence plate #> - \`Searches for Vehicle by Licence Plate #\`
  //         **${prefix}firearmdb** <Serial #> - \`Searches for Firearms by Serial #\`
  //         **${prefix}panic** - \`Enables/Disables your panic button\`
  //         **${prefix}license** <revoke|reinstate> <firstName> <lastName> <dob> - \`Revoke/Reinstate License\`
  //         `,
  //         inline: true
  //       },
  //       {
  //         name: `**__LPC Command (2/2):__**`,
  //         value: `
  //         **${prefix}roles** - \`Shows a list of allowed roles\`
  //         **${prefix}channels** - \`Shows a list of allowed channels\`
  //         **${prefix}joincommunity** <community code> - \`Joins a community with the given code\`
  //         **${prefix}leavecommunity** - \`Leaves your current active community\`
  //         **${prefix}community** - \`Returns the name of the Community your currenty in\`
  //         `,
  //         inline: false
  //       },
  //       {
  //         name: `**__Admin Commands:__**`,
  //         value: `
  //         **${prefix}setPrefix** <new prefix> - \`Sets new prefix\`
  //         **${prefix}setChannel** <channel> - \`Adds channel to list of allowed channels\`
  //         **${prefix}removeChannel** <channel> - \`Removes channel from list of allowed channels\`
  //         **${prefix}setRole** <role> - \`Adds role to list of allowed roles\`
  //         **${prefix}removeRole** <role> - \`Removes role from list of allowed roles\`
  //         **${prefix}togglePingOnPanic** <true|false> <role> - \`Enable/disable ping role on panic\`
  //         `,
  //         inline: false
  //       })

  //     const stats = new MessageEmbed()
  //         .setColor('#0099ff')
  //         .setTitle("Current LPC-Bot Statistics")
  //         .setURL('https://discord.gg/w2g2FFmHbF')
  //         .addField(" \u200B ", "**Channels** : ` " + `${client.channels.cache.size}` + " `")
  //         .addField(" \u200B ", "**Servers** : ` " + `${client.guilds.cache.size}` + " `")
  //         .addField(" \u200B ", "**Users** : ` " + `${client.users.cache.size}` + " `")

  //     if (command == 'ping') return message.channel.send('Pong!');
  //     if (command == 'help') return message.channel.send(help);
  //     if (command == 'stats') return message.channel.send(stats);
  //     if (command == 'setprefix') {
  //       if (message.channel.type=="dm") return message.author.send(`You cannot set a prefix in a dm ${message.author}`);
  //       if(!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
  //       this.commandHandler.newPrefix(message, args);
  //     }
  //     if (command == 'setchannel') {
  //       if (message.channel.type=="dm") return message.author.send(`You cannot set a channel in a dm ${message.author}`);
  //       if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
  //       this.commandHandler.setChannel(message, args);
  //     }
  //     if (command == 'removechannel') {
  //       if (message.channel.type=="dm") return message.author.send(`You cannot remove a channel in a dm ${message.author}`);
  //       if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
  //       this.commandHandler.removeChannel(message, args); 
  //     }
  //     if (command == 'setrole') {
  //       if (message.channel.type=="dm") return message.author.send(`You cannot set a role in a dm ${message.author}`);
  //       if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
  //       this.commandHandler.setRole(message, args); 
  //     }
  //     if (command == 'removerole') {
  //       if (message.channel.type=="dm") return message.author.send(`You cannot remove a role in a dm ${message.author}`);
  //       if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
  //       this.commandHandler.removeRole(message, args); 
  //     }
  //     if (command == 'togglepingonpanic') {
  //       if (message.channel.type=="dm") return message.author.send(`You cannot remove a role in a dm ${message.author}`);
  //       if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
  //       this.commandHandler.togglePingOnPanic(message, args);
  //     }
  //     if (command == 'roles') {
  //       if (message.channel.type=="dm") return message.author.send(`You cannot see allowed roles in a dm ${message.author}`);
  //       this.commandHandler.roles(message);
  //     }
  //     if (command == 'channels') {
  //       if (message.channel.type=="dm") return message.channel.send(`You cannot see allowed channels in a dm ${message.author}`);
  //       this.commandHandler.channels(message);
  //     }
  //     if (command == 'pingonpanic') {
  //       if (message.channel.type=="dm") return message.channel.send(`You cannot see allowed channels in a dm ${message.author}`);
  //       this.commandHandler.getPingOnPanicStatus(message);
  //     }

  //     // Login
  //     if (command == 'login') {
  //       if (message.channel.type=="text") return message.channel.send(`You must direct message me to use this command ${message.author}`);
  //       this.commandHandler.remoteLogin(message, args);
  //     }
  //     if (command == 'logout') this.commandHandler.remoteLogout(message);
  //     if (command == 'validstatus') return message.channel.send(validStatus);
  //     if (command == 'checkstatus') {
  //       if (customRoleStatus) {
  //         let hasRole = await this.commandHandler.checkRoleStatus(message);
  //         if (hasRole) {
  //           this.commandHandler.checkStatus(message, args);
  //         } else return message.channel.send(`You don't have permission to use this command ${message.author}`);
  //       } else this.commandHandler.checkStatus(message, args);
  //     }
  //     if (command == 'updatestatus') {
  //       if (customRoleStatus) {
  //         let hasRole = await this.commandHandler.checkRoleStatus(message);
  //         if (hasRole) {
  //           this.commandHandler.updateStatus(message, args, prefix);
  //         } else return message.channel.send(`You don't have permission to use this command ${message.author}`);
  //       } else this.commandHandler.updateStatus(message, args, prefix);
  //     }
  //     if (command == 'account') this.commandHandler.account(message);
  //     if (command == 'penalcodes') return message.channel.send('https://www.linespolice-cad.com/penal-code');
  //     if (command == 'namedb') {
  //       if (customRoleStatus) {
  //         let hasRole = await this.commandHandler.checkRoleStatus(message);
  //         if (hasRole) {
  //           this.commandHandler.nameSearch(message, args);
  //         } else return message.channel.send(`You don't have permission to use this command ${message.author}`);
  //       } else this.commandHandler.nameSearch(message, args);
  //     }
  //     if (command == 'platedb') {
  //       if (customRoleStatus) {
  //         let hasRole = await this.commandHandler.checkRoleStatus(message);
  //         if (hasRole) {
  //           this.commandHandler.plateSearch(message, args);
  //         } else return message.channel.send(`You don't have permission to use this command ${message.author}`);
  //       } else this.commandHandler.plateSearch(message, args);
  //     }
  //     if (command == 'firearmdb') {
  //       if (customRoleStatus) {
  //         let hasRole = await this.checkRoleStatus(message);
  //         if (hasRole) {
  //           this.commandHandler.firearmSearch(message, args);
  //         } else return message.channel.send(`You don't have permission to use this command ${message.author}`);
  //       } else this.commandHandler.firearmSearch(message, args);
  //     }
  //     if (command == 'panic') {
  //       if (customRoleStatus) {
  //         let hasRole = await this.commandHandler.checkRoleStatus(message);
  //         if (hasRole) {
  //           this.commandHandler.enablePanic(message);
  //         } else return message.channel.send(`You don't have permission to use this command ${message.author}`);
  //       } else this.commandHandler.enablePanic(message);
  //     }
  //     if (command == 'license') {
  //       if (customRoleStatus) {
  //         let hasRole = await this.commandHandler.checkRoleStatus(message);
  //         if (hasRole) {
  //           this.commandHandler.updateLicense(message, args);
  //         } else return message.channel.send(`You don't have permission to use this command ${message.author}! `);
  //       } else this.commandHandler.updateLicense(message, args);
  //     }
  //     if (command == 'joincommunity') this.commandHandler.joinCommunity(message, args);
  //     if (command == 'leavecommunity') this.commandHandler.leaveCommunity(message);
  //     if (command == 'community') this.commandHandler.community(message);

  //     // Dev Commands (not visible in help) && easter egg commands
  //     if (command == 'version') message.channel.send(`**LPS-BOT Version : ${this.dev}-${this.config.version}**`)
  //     if (command == 'whatisthemeaningoflife') message.channel.send('42');
  //     if (command == 'whatareyou' || command == 'whoareyou') message.channel.send('Im your friendly neighborhood Lines Police CAD Bot');
  //     if (command == 'whocreatedyou') message.channel.send('Lines Police CAD Developer McDazzzled | https://github.com/SowinskiBraeden');
  //     if (command == 'pingserver') {
  //       const socket = io.connect(this.config.socket);
  //       socket.emit('botping', {message:'hello there'});
  //       socket.on('botpong', (data) => {
  //         console.log(data);
  //         message.channel.send(`Debug: Server responded`)
  //         socket.disconnect();
  //       });
  //     }
  //   });
  // }
}

module.exports = LinesPoliceCadBot;