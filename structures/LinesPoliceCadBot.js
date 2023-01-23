const { Collection, Client, EmbedBuilder, Routes } = require('discord.js');
const MongoClient = require('mongodb').MongoClient;
const { REST } = require('@discordjs/rest');
const Logger = require("../util/Logger");
const io = require('socket.io-client');
const path = require("path");
const fs = require('fs');

class LinesPoliceCadBot extends Client {

  constructor(options, config) {
    super(options)

    this.config = config;
    this.commands = new Collection();
    this.interactionHandlers = new Collection();
    this.logger = new Logger(path.join(__dirname, "..", "logs/Logs.log"));

    if (this.config.Token === "")
    return new TypeError(
      "The botconfig.js is not filled out. Please make sure nothing is blank, otherwise the bot will not work properly."
    );

    this.db;
    this.dbo;
    this.connectMongo(this.config.mongoURI, this.config.dbo);
    this.databaseConnected = false;
    this.LoadCommandsAndInteractionHandlers();
    this.LoadEvents();

    this.Ready = false;

    this.ws.on("INTERACTION_CREATE", async (interaction) => {
      if (interaction.type!=3) {
        let GuildDB = await this.GetGuild(interaction.guild_id);
        
        const command = interaction.data.name.toLowerCase();
        const args = interaction.data.options;
        
        client.log(`Interaction - ${command}`)

        //Easy to send respnose so ;)
        interaction.guild = await this.guilds.fetch(interaction.guild_id);
        interaction.send = async (message) => {
          const rest = new REST({ version: '10' }).setToken(client.config.Token);

          return await rest.post(Routes.interactionCallback(interaction.id, interaction.token), {
            body: {
              type: 4,
              data: message,
            }
          });
        };

        if (!this.databaseConnected) {
          let dbFailedEmbed = new EmbedBuilder()
            .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThe bot has failed to connect to the database 5 times!\nContact the Developers`)
            .setColor(client.config.Colors.Red);

          return interaction.send({ embeds: [dbFailedEmbed] });
        }

        let cmd = client.commands.get(command);
        try {
          cmd.SlashCommand.run(this, interaction, args, { GuildDB });
        } catch (err) {
          this.sendInternalError(interaction, err);
        }
      }
    });

    const client = this;
  }

  async connectMongo(mongoURI, dbo) {
    let failed = false;
    
    let dbLogDir = path.join(__dirname, '..', 'logs', 'database-logs.json');
    let databaselogs;
    try {
      databaselogs = JSON.parse(fs.readFileSync(dbLogDir));
    } catch (err) {
      databaselogs = {
        attempts: 0,
        connected: false,
      }
    }

    if (databaselogs.attempts >= 5) {
      this.error('Failed to connect to mongodb after multiple attempts');
      return; // prevent further attempts
    }

    try {
      // Connect to MongoDB
      this.db = await MongoClient.connect(mongoURI,{useUnifiedTopology:true});
      this.dbo = this.db.db(dbo);
      this.log('Successfully connected to mongoDB');
      databaselogs.connected = true;
      databaselogs.attempts = 0;
      this.databaseConnected = true;
    } catch (err) {
      databaselogs.attempts++;
      this.error(`Failed to connect to mongodb: attempt ${databaselogs.attempts}`);
      failed = true;
    }

    // write JSON string to a file
    await fs.writeFileSync(dbLogDir, JSON.stringify(databaselogs));

    if (failed) process.exit(-1);
  }

  // This is for the 'panic' command when enabling panic
  // May be used by other interaction
  async forceUpdateStatus(status, user) {
    let onDuty=null;
    let updateDuty=false;
    if (status=='10-41') {
      onDuty=true;
      updateDuty=true;
      status='Online';
    }
    if (status=='10-42') {
      onDuty=false;
      updateDuty=true;
      status='Offline';
    }
    let req={
      userID: user._id,
      status: status,
      setBy: 'Self',
      onDuty: onDuty,
      updateDuty: updateDuty
    };
    const socket = io.connect(this.config.socket);
    socket.emit('bot_update_status', req);
    socket.on('bot_updated_status', (res) => {
      socket.disconnect();
    });
  }

  /* Not yet done
  async canUseCommand(interaction, GuildDB) {
    if (!GuildDB.customChannelStatus) return true;
    let channel_id;
    for (let i = 0; i < GuildDB.allowedChannels.length; i++) {
      channel_id = GuildDB.allowedChannels[i];
      if(interaction.guild.channels.cache.get(channel_id) === undefined)  { 
        this.dbo.collection("prefixes").updateOne({"server.serverID":interaction.guild.id},{$pull:{"server.allowedChannels":channel_id},$set:{"server.hasCustomChannels":false}},function(err, res) {
          if (err) throw err;
          GuildDB.allowedChannels.splice(i, i+1);
          if (GuildDB.allowedChannels.length == 0) GuildDB.customChannelStatus = false;
        });
      }
    }
    if (!GuildDB.allowedChannels.includes(interaction.channel_id)) {
      return false;
    }
  }
  */

  exists(n) {return null != n && undefined != n && "" != n}

  LoadCommandsAndInteractionHandlers() {
    let CommandsDir = path.join(__dirname, '..', 'commands');
    fs.readdir(CommandsDir, (err, files) => {
      if (err) this.error(err);
      else
        files.forEach((file) => {
          let cmd = require(CommandsDir + "/" + file);
          if (!cmd.name || !cmd.description)
            return this.log(
              "Unable to load Command: " +
                file.split(".")[0] +
                ", Reason: File doesn't had run/name/desciption"
            );
          this.commands.set(file.split(".")[0].toLowerCase(), cmd);
          if (this.exists(cmd.Interactions)) {
            for (let [interaction, handler] of Object.entries(cmd.Interactions)) {
              this.interactionHandlers.set(interaction, handler);
            }
          }
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
          if (file.split(".")[0] == 'interactionCreate') this.on(file.split(".")[0], i => event(this, i));
          else this.on(file.split(".")[0], event.bind(null, this));
          this.logger.log("Event Loaded: " + file.split(".")[0]);
        });
    });
  }

  sendInternalError(Interaction, Error) {
    this.error(Error);
    const embed = new EmbedBuilder()
      .setDescription(`**Internal Error:**\nUh Oh D:  Its not you, its me.\nThis command has crashed\nCOntact the Developers`)
      .setColor(this.config.Colors.Red)

    Interaction.send({ embeds: [embed] });
  }

  sendTime(Channel, Error) {
    let embed = new EmbedBuilder()
      .setColor(this.config.EmbedColor)
      .setDescription(Error);

    Channel.send({ embeds: [embed] });
  }

  RegisterSlashCommands() {
    this.guilds.cache.forEach((guild) => {
      require("../util/RegisterSlashCommands")(this, guild.id);
    });
  }

  async checkRoleStatus(rolesCache, serverID, isList) {
    let hasRole = false;
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":serverID}).then(guild => guild);
    // If user has one of any in the list of allowed roles, hasRole is true
    for (let i = 0; i < guild.server.allowedRoles.length; i++) {
      if (!isList) {
        if (rolesCache.some(role => role.id == guild.server.allowedRoles[i])) {
          hasRole = true
          break
        }
      } else {
        if (rolesCache.includes(guild.server.allowedRoles[i])) {
          hasRole = true
          break
        }
      }
    }
    return hasRole;
  }

  async GetGuild(GuildId) {
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":GuildId}).then(guild => guild);

    // If guild not found, generate guild default
    if (!guild) {
      guild = {
        server: {
          serverID: GuildId,
          allowedChannels: [],
        }
      }
      this.dbo.collection("prefixes").insertOne(guild, function(err, res) {
        if (err) throw err;
      });
    }
    let guildData = {
      allowedChannels: guild.server.allowedChannels,
      customChannelStatus: guild.server.allowedChannels.length > 0 ? true : false,
      serverID: GuildId
    }
    return guildData;
  }

  /*
   This command is to verify a user
   has the correct role to use a 
   command ie. has cop role to use
   name-search
  */
  async verifyUseCommand(serverID, rolesCache, isList) {
    let { customRoleStatus } = await this.GetGuild(serverID)
    if (customRoleStatus) {
      let hasRole = await this.checkRoleStatus(rolesCache, serverID, isList);
      if (hasRole) {
        return true // User has role, can use command
      } else return false // User does not have role, can't use command
    } else return true // There is no role limits
  }

  log(Text) { this.logger.log(Text); }
  error(Text) { this.logger.error(Text); }

  build() {
    this.login(this.config.Token);
  }
}

module.exports = LinesPoliceCadBot;