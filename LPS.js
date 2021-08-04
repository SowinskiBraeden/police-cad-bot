const MongoClient = require('mongodb').MongoClient;
const io = require('socket.io-client');
const bcrypt = require('bcrypt');
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config');


class Bot {

  constructor(dev, token) {
    this.dev = dev;
    this.token = token;
  }

  // Updates Prefix
  async newPrefix(message, n) {
    if (n[0]==undefined) return message.channel.send(`You must provide a **new prefix** ${message.author}!`);
    if (n[0].length<1) return message.channel.send('Your new prefix must be \`1\` character!')
    let db = await MongoClient.connect(config.mongoURI,{useUnifiedTopology:true});
    let dbo = db.db(config.dbo);
    dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.prefix":n[0]}},function(err, res) {
      if (err) throw err;
      return message.channel.send(`The new prefix is now **\`${n}\`**`);
    });
  }

  // Remote Login
  async remoteLogin(message, args) {
    if (args.length==0) return message.author.send(`You must provide a **email** and **password** ${message.author}!`);
    if (!args[0]==null||!args[0]==undefined&&args[1]==null||args[1]==undefined) return message.author.send(`You must provide a **password** ${message.author}!`);
    let db = await MongoClient.connect(config.mongoURI,{useUnifiedTopology:true});
    let dbo = db.db(config.dbo);
    let user = await dbo.collection("users").findOne({"user.email":args[0]}).then(user => user);
    if (user==null||user==undefined) return message.author.send(`Cannot find the email **${args[0]}** ${message.author}!`);
    if (user.user.discord) {
      if (user.user.discord.id==message.author.id) return message.author.send(`You are already logged in ${message.author}!`);
    }

    // Match Password
    bcrypt.compare(args[1], user.user.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        // Modify user to include user.user.discord
        let discord = {
          id: message.author.id,
          username: message.author.username,
          discriminator: message.author.discriminator
        }
        dbo.collection("users").updateOne({"user.email":args[0]},{$set:{"user.discord": discord}},function(err,res) {
          if (err) throw err;
          return message.author.send(`Logged in as **${user.user.username}** ${message.author}!`);
        });
      } else {
        return message.author.send(`Incorrect password for **${args[0]}** ${message.author}!`);
      }
    });
  }

  async function remoteLogout(message) {
    let db = await MongoClient.connect(config.mongoURI,{useUnifiedTopology:true});
    let dbo = db.db(config.dbo);
    let user = await dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You cannot logout if your not logged in ${message.author}!`);
    dbo.collection("users").updateOne({"user.discord.id":message.author.id},{$unset:{"user.discord":""}},function(err,res) {
      if (err) throw err;
      return message.channel.send(`Succesfully logged out ${message.author}!`);
    });
  }

  async getUser(id) {
    let db = await MongoClient.connect(config.mongoURI,{useUnifiedTopology:true});
    let dbo = db.db(config.dbo);
    return await dbo.collection("users").findOne({"user.discord.id":id}).then(user => user);
  }

  async account(message) {
    getUser(message).then(user => {
      if (user==null) return message.channel.send(`You are not logged in ${message.author}!`);
      return message.author.send(`${message.author} Logged in as **${user.user.username}**  |  **${user.user.email}**`);
    });
  }

  async checkStatus(message, args) {
    if (args.length==0) {
      getUser(message.author.id).then(user => {
        if (user==null) return message.channel.send(`You are not logged in ${message.author}!`);
        return message.channel.send(`${message.author}'s status: ${user.user.dispatchStatus} | Set by: ${user.user.dispatchStatusSetBy}`);
      });
    } else {
      getUser(args[0].id).then(user => {
        if (user==null) return message.channel.send(`Cannot find **${args[0]}** ${message.author}!`);
        // This lame code to get username without ping on discord
        let id = args[0].replace('<@!', '').replace('>', '');
        const User = client.users.cache.get(id);
        return message.channel.send(`${message.author}, **${User.tag}'s** status: ${user.user.dispatchStatus} | Set by: ${user.user.dispatchStatusSetBy}`);
      });
    }
  }

  async updateStatus(message, args, prefix) {
    let validStatus=['10-8','10-7','10-6','10-11','10-23','10-97','10-15','10-70','10-80'];
    getUser(message.author.id).then(user => {
      if (user==null) return message.channel.send(`You are not logged in ${message.author}!`);
      if (args.length==0) return message.channel.send(`You must provide a new status ${message.author} | To see a list of valid statuses, use command \`${prefix}validStatus\`.`);
      if (!validStatus.includes(args[0])) return message.channel.send(`**${args[0]}** is a Invalid Status ${message.author}! To see a list of valid statuses, use command \`${prefix}validStatus\`.`);
      let onDuty=null;
      let updateDuty=false;
      let status = args[0]
      if (args[0]=='10-41') {
        onDuty=true;
        updateDuty=true;
        status='Online';
      }
      if (args[0]=='10-42') {
        onDuty=false;
        updateDuty=true;
        status='Offline';
      }
      req={
        userID: user._id,
        status: status,
        setBy: 'Self',
        onDuty: onDuty,
        updateDuty: updateDuty
      };
      const socket = io.connect(config.socket);
      socket.emit('bot_update_status', req);
      socket.on('bot_updated_status', (res) => {
          return message.channel.send(`Succesfully updated status to **${args[0]}** ${message.author}!`);
      });
    });
  }

  async getPrefix(message) {
    let prefix;
    let db = await MongoClient.connect(config.mongoURI,{useUnifiedTopology:true});
    let dbo = db.db(config.dbo);

    if (message.channel.type!="dm") {
      let guild = await dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);

      // If not prefix, generate server default
      if (!guild) {
        let newGuild = {
          server: {
            serverID: message.guild.id,
            prefix: config.defaultPrefix
          }
        }
        dbo.collection("prefixes").insertOne(newGuild, function(err, res) {
          if (err) throw err;
        });
        prefix = newGuild.server.serverID;
      } else prefix = guild.server.prefix;
    } else prefix = config.defaultPrefix;
    return prefix
  }

  main() {
    client.on('ready', () => {
      console.log(`Logged in as ${client.user.tag}`);
    });

    // Basic Commands
    client.on('message', (message) => {
      getPrefix(message).then(prefix => {
        if (!message.content.startsWith(prefix) || message.author.bot) return;

        const args = message.content.slice(prefix.length).trim().split(' ');
        const command = args.shift().toLowerCase();

        // Valid Statuses Embed
        let validStatus = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle('Lines Police CAD')
          .setURL('https://www.linespolice-cad.com/')
          .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
          .setDescription('Valid Statuses')
          .addFields(
            { name: 'Statuses:', value: `
              10-8   |  On Duty
              10-7   |  Off Duty
              10-6   |  Busy
              10-11  |  Traffic Stop
              10-23  |  Arrive on Scene
              10-97  |  In Route
              10-15  |  Subject in Custody
              10-70  |  Foot Pursuit
              10-80  |  Vehicle Pursiut
              `
            }    
          )

        // Help Embed
        let help = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle('**Commands:**')
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
          .setDescription('Lines Police CAD Bot Commands')
          .addFields(
            { name: `**${prefix}help**`, value: 'Displays this help page', inline: true },
            { name: `**${prefix}ping**`, value: 'Responds with Pong to check Bot responce', inline: true },
            { name: `**${prefix}setPrefix** <new prefix>`, value: 'Sets new prefix (Admin only command)', inline: true },
            { name: `**${prefix}login** <email> <password>`, value: 'Login to LPS account (DM only command)', inline: true },
            { name: `**${prefix}logout**`, value: 'Logs out of your current logged in account', inline: true },
            { name: `**${prefix}validStatus**`, value: 'Shows list of valid statuses to updade to', inline: true },
            { name: `**${prefix}checkStatus** <user>`, value: 'Leave user blank to check own status', inline: true },
            { name: `**${prefix}updateStatus** <status>`, value: 'Updates your status', inline: true },
            { name: `**${prefix}account**`, value: 'returns logged in account', inline: true },
            { name: `**${prefix}penalCodes**`, value: 'Provides Link to penal codes', inline: true }      )

        if (command == 'ping') message.channel.send('Pong!');
        if (command == 'help') message.channel.send(help);
        if (command == 'setprefix') {
          if (message.channel.type=="dm") return message.author.send(`You cannot set a prefix in a dm ${message.author}!`);
          if(!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
          newPrefix(message, args);
        }
        // Login
        if (command == 'login') {
          if (message.channel.type=="text") return message.channel.send(`You must direct message me to login ${message.author}!`);
          remoteLogin(message, args);
        }
        if (command == 'logout') remoteLogout(message);
        if (command == 'validstatus') return message.channel.send(validStatus);
        if (command == 'checkstatus') checkStatus(message, args);
        if (command == 'updatestatus') updateStatus(message, args, prefix);
        if (command == 'account') account(message);
        if (command == 'penalcodes') return message.channel.send('https://www.linespolice-cad.com/penal-code');
        if (command == 'namedb') nameSearch(message, args);
        if (command == 'platedb') plateSearch(message, args);
        if (command == 'firearmdb') weaponSearch(message, args);
        if (command == 'createbolo') createBolo(message, args);
        if (command == 'panic') enablePanic(message);

        // Dev Commands (not visible in help)
        if (command == 'version') return message.channel.send(`**LPS-BOT Version : ${this.dev}-${config.version}**`)
        if (command == 'whatisthemeaningoflife') message.channel.send('42');
      });
    });
    
    client.login(this.token);
  }
}
