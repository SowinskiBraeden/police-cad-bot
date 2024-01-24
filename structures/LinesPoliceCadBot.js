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

    if (this.config.Token === "") return new TypeError(
      "The config.js is missing a token, please ensure the token is provided."
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
      };
    }

    if (databaselogs.attempts >= 5) {
      this.error('Failed to connect to mongodb after multiple attempts');
      return; // prevent further attempts
    }

    try {
      // Connect to Mongo database.
      this.db = await MongoClient.connect(mongoURI, { useUnifiedTopology: true,  connectTimeoutMS: 1000 });
      this.dbo = this.db.db(dbo);
      this.log('Successfully connected to mongoDB');
      databaselogs.connected = true;
      databaselogs.attempts = 0;
      this.databaseConnected = true;
    } catch (err) {
      databaselogs.attempts++;
      let db = (mongoURI.includes("@") ? mongoURI.split("@")[1] : mongoURI.split("//")[1]).endsWith("/") ? mongoURI.slice(0, -1) : mongoURI;
      this.error(`Failed to connect to mongodb (mongodb://${db}/${dbo}): attempt ${databaselogs.attempts} - ${err}`);
      failed = true;
    }

    // write JSON string to a file
    fs.writeFileSync(dbLogDir, JSON.stringify(databaselogs));

    if (failed) process.exit(-1);
  }

  // This is for the 'panic' command when enabling panic
  // May be used by other interaction
  async forceUpdateStatus(status, user) {
    let onDuty = null;
    let updateDuty = false;
    
    // If the are off duty, make them on duty + online
    if (status == '10-41') {
      onDuty = true;
      updateDuty = true;
      status = 'Online';
    }
    
    // If they are on duty, 
    if (status == '10-42') {
      onDuty = false;
      updateDuty = true;
      status = 'Offline';
    }
    
    let req = {
      userID:     user._id,
      status:     status,
      setBy:      'Self',
      onDuty:     onDuty,
      updateDuty: updateDuty
    };

    const socket = io.connect(this.config.socket);
    
    socket.emit('bot_update_status', req);
    socket.on('bot_updated_status', (res) => {
      if (res.userID == user._id) socket.disconnect(); // ensure success response is for us
    });
  }

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
    let p = Promise.resolve()
    this.guilds.cache.forEach((guild) => {
      p = p.then(() => {
        require("../util/RegisterSlashCommands")(this, guild.id);
        return new Promise((resolve) => {
          setTimeout(resolve, 500);
        })
      })
    });
  }

  async checkRoleStatus(rolesCache, allowedRoles) {
    if (allowedRoles.length == 0) return true; // If we are in this function, and there are no roles to compare to, return true as if we had the role anyway

    for (let i = 0; i < allowedRoles.length; i++) {
      if (rolesCache.includes(allowedRoles[i])) return true; // they have at least one matching role
      else continue;
    }

    return false; // they have no matching roles.
  }

  async GetGuild(GuildId) {
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":GuildId}).then(guild => guild);

    // If guild not found, generate guild default
    if (!guild) {
      guild = {
        server: {
          serverID: GuildId,
          allowedChannels: [],
          allowedRoles: [],
        }
      }
      this.dbo.collection("prefixes").insertOne(guild, function(err, res) {
        if (err) throw err;
      });
    }
    if (guild.server.allowedRoles == undefined) guild.server.allowedRoles = [];
    let guildData = {
      allowedChannels: guild.server.allowedChannels,
      customChannelStatus: guild.server.allowedChannels.length > 0 ? true : false,
      customRoleStatus: guild.server.allowedRoles.length > 0 ? true : false,
      allowedRoles: guild.server.allowedRoles,
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
  async verifyUseCommand(serverID, rolesCache) {
    let guildDB = await this.GetGuild(serverID);
    if (!guildDB.customRoleStatus) return true; // There is no role limits, can use command

    // Clear any deleted roles
    let filteredRoles = [];
    let update = false;
    const guild = await this.guilds.cache.get(serverID);
    for (let i = 0; i < guildDB.allowedRoles.length; i++) {
      let role = guild.roles.cache.find(role => role.id == guildDB.allowedRoles[i])
      if (!role) update = true; // this role no longer exists, we need to update, dont add to list
      else filteredRoles.push(guildDB.allowedRoles[i]); // this role exists, add to list in case of update
    }

    // If some roles no longer exists, update
    // or if customRoleStatus is true but no roles exist, update
    if (update || (filteredRoles.length == 0 && customRoleStatus)) {
      let newHasCustomRoles = filteredRoles.length > 0;

      await this.dbo.collection("prefixes").updateOne({ 'server.serverID': serverID }, { $set: {
        'server.allowedRoles': filteredRoles,
        'server.hasCustomRoles': newHasCustomRoles,
      }}, (err, res) => {
        if (err) throw err;
      });
    }

    let hasRole = await this.checkRoleStatus(rolesCache, filteredRoles);
    return hasRole;
  }

  log(Text) { this.logger.log(Text); }
  error(Text) { this.logger.error(Text); }

  build() {
    this.login(this.config.Token);
  }
}

module.exports = LinesPoliceCadBot;