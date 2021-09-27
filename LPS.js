const MongoClient = require('mongodb').MongoClient;
const randomstring = require('randomstring');
const io = require('socket.io-client');
const Discord = require('discord.js');
const client = new Discord.Client();

class Bot {

  constructor(dev, token, config, mongoURI, dbo) {
    this.dev = dev;
    this.token = token;
    this.config = require(config);
    this.connectMongo(mongoURI, dbo);
  }

  async connectMongo(mongoURI, dbo) {
    this.db = await MongoClient.connect(mongoURI,{useUnifiedTopology:true});
    this.dbo = this.db.db(dbo);
  }

  // Updates Prefix
  async newPrefix(message, n) {
    if (n[0]==undefined) return message.channel.send(`You must provide a **new prefix** ${message.author}!`);
    if (n[0].length<1) return message.channel.send('Your new prefix must be \`1\` character!')
    this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.prefix":n[0]}},function(err, res) {
      if (err) throw err;
      message.channel.send(`The new prefix is now **\`${n}\`**`);
    });
  }

  // Remote Login
  async remoteLogin(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (user) return message.author.send(`You are already logged in ${message.author}! Use \`?logout\` to logout or \`?account\` to see your logged in account.`);
    if (args.length==0) return message.author.send(`You must provide a **email** and **login token** ${message.author}!`);
    if (!args[0]==null||!args[0]==undefined&&args[1]==null||args[1]==undefined) return message.author.send(`You must provide a **login token** ${message.author}!`);
    user = await this.dbo.collection("users").findOne({"user.email":args[0]}).then(user => user);
    if (user==null||user==undefined) return message.author.send(`Cannot find the email **${args[0]}** ${message.author}!`);
    
    // Check discord Login Token
    if (args[1]==user.user.discordLoginToken) {
      // Modify user to include user.user.discord
      let discord = {
        id: message.author.id,
        username: message.author.username,
        discriminator: message.author.discriminator
      }
      let newToken = randomstring.generate(12);
      this.dbo.collection("users").updateOne(
        {
        "user.email": args[0]
        },
        {
          $set: {
            "user.discord": discord,
            "user.discordLoginToken": newToken
          }
        }, function(err,res) {
          if (err) throw err;
          return message.author.send(`Logged in as **${user.user.username}** ${message.author}!`);
        }
      );
    } else {
      return message.author.send(`Incorrect login token ${message.author}! Try again or Regenerate your Discord Login Token.`);
    }
  }

  async remoteLogout(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You cannot logout if your not logged in ${message.author}!`);
    this.dbo.collection("users").updateOne({"user.discord.id":message.author.id},{$unset:{"user.discord":""}},function(err,res) {
      if (err) throw err;
      message.channel.send(`Succesfully logged out ${message.author}!`);
    });
  }

  async account(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (user==null) return message.channel.send(`You are not logged in ${message.author}!`);
    message.author.send(`${message.author} Logged in as **${user.user.username}**  |  **${user.user.email}**`);
  }

  async nameSearch(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    let data;
    if (user.user.activeCommunity=='' || user.user.activeCommunity==null) {
      if (args.length==0) return message.channel.send(`You must provide a **First Name**, **Last Name** and **DOB**(mm/dd/yyyy) ${message.author}!`);
      if (args.length==1) return message.channel.send(`You're missing a **Last Name** and **DOB**(mm/dd/yyyy) ${message.author}!`);
      if (args.length==2) return message.channel.send(`You're missing a **DOB**(mm/dd/yyyy) ${message.author}!`);
    }
    if (args.length==0) return message.channel.send(`You must provide a **First Name** and **Last Name** ${message.author}!`);
    if (args.length==1) return message.channel.send(`You're missing a **Last Name** ${message.author}!`);

    if (user.user.activeCommunity=='' || user.user.activeCommunity==null) {
      data = {
        user: user,
        query: {
          firstName: args[0],
          lastName: args[1],
          dateOfBirth: args[2],
          activeCommunityID: user.user.activeCommunity
        }
      }
    } else {
      data = {
        user: user,
        query: {
          firstName: args[0],
          lastName: args[1],
          activeCommunityID: user.user.activeCommunity
        }
      }
    }

    const socket = io.connect(this.config.socket);
    socket.emit("bot_name_search", data);
    socket.on("bot_name_search_results", results => {

      if (results.user._id==user._id) {
        if (results.civilians.length == 0) {
          return message.channel.send(`Name **${args[0]} ${args[1]}** not found ${message.author}`);
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
          let nameResult = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.civilians[i].civilian.firstName} ${results.civilians[i].civilian.lastName} | ${results.civilians[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
          .setDescription('Name Search Results')
          .addFields(
            { name: `**First Name**`, value: `**${results.civilians[i].civilian.firstName}**`, inline: true },
            { name: `**Last Name**`, value: `**${results.civilians[i].civilian.lastName}**`, inline: true },
            { name: `**DOB**`, value: `**${results.civilians[i].civilian.birthday}**`, inline: true },
            { name: `**Drivers License**`, value: `**${licenceStatus}**`, inline: true },
            { name: `**Firearm Licence**`, value: `**${firearmLicence}**`, inline: true },
            { name: `**Gender**`, value: `**${results.civilians[i].civilian.gender}**`, inline: true }
          )
          // Check Other details
          let address = results.civilians[i].civilian.address;
          let occupation = results.civilians[i].civilian.occupation;
          let height = results.civilians[i].civilian.height;
          let weight = results.civilians[i].civilian.weight;
          let eyeColor = results.civilians[i].civilian.eyeColor;
          let hairColor = results.civilians[i].civilian.hairColor;
          if (address != null && address != undefined && address != '') nameResult.addFields({ name: `**Address**`, value: `**${address}**`, inline: true });
          if (occupation != null && occupation != undefined && occupation != '') nameResult.addFields({ name: `**Occupation**`, value: `**${occupation}**`, inline: true });
          if (height!=null&&height!=undefined&&height!="NaN"&&height!='') {
            if (results.civilians[i].civilian.heightClassification=='imperial') {
              let ft = Math.floor(height/12);
              let inch = height%12;
              nameResult.addFields({ name: '**Height**', value: `**${ft}'${inch}"**`, inline: true });
            } else {
              nameResult.addFields({ name: '**Height**', value: `**${height}cm**`, inline: true });
            }
          }
          if (weight!=null&&weight!=undefined&&weight!='') {
            if (results.civilians[i].civilian.weightClassification=='imperial') {
              nameResult.addFields({ name: '**Weight**', value: `**${weight}lbs.**`, inline: true });
            } else {
              nameResult.addFields({ name: '**Weight**', value: `**${weight}kgs.**`, inline: true });
            } 
          }
          if (eyeColor!=null&&eyeColor!=undefined&&eyeColor!='') nameResult.addFields({name:'**Eye Color**',value:`**${eyeColor}**`,inline:true});
          if (hairColor!=null&&hairColor!=undefined&&hairColor!='') nameResult.addFields({name:'**Hair Color**',value:`**${hairColor}**`,inline:true});
          nameResult.addFields({name:'**Organ Donor**',value:`**${results.civilians[i].civilian.organDonor}**`,inline:true});
          nameResult.addFields({name:'**Veteran**',value:`**${results.civilians[i].civilian.veteran}**`,inline:true});
          message.channel.send(nameResult);
        }
      }
      socket.disconnect();
    });
  }

  async plateSearch(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (args.length==0) return message.channel.send(`You are missing a **Plate #** ${message.author}`);
    let data = {
      user: user,
      query: {
        plateNumber: args[0],
        activeCommunityID: user.user.activeCommunity
      }
    }
    const socket = io.connect(this.config.socket);
    socket.emit('bot_plate_search', data);
    socket.on('bot_plate_search_results', results => {
      
      if (results.user._id==user._id) {
        if (results.vehicles.length == 0) {
          return message.channel.send(`Plate Number **${args[0]}** not found ${message.author}`);
        }

        for (let i = 0; i < results.vehicles.length; i++) {
          let plateResult = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.vehicles[i].vehicle.plate} | ${results.vehicles[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
          .setDescription('Plate Search Results')
          .addFields(
            { name: `**Plate #**`, value: `**${results.vehicles[i].vehicle.plate}**`, inline: true },
            { name: `**Vin #**`, value: `**${results.vehicles[i].vehicle.vin}**`, inline: true },
            { name: `**Model**`, value: `**${results.vehicles[i].vehicle.model}**`, inline: true },
            { name: `**Color**`, value: `**${results.vehicles[i].vehicle.color}**`, inline: true },
            { name: `**Owner**`, value: `**${results.vehicles[i].vehicle.registeredOwner}**`, inline: true },
          )
          // Other details
          let validRegistration = results.vehicles[i].vehicle.validRegistration;
          let validInsurance = results.vehicles[i].vehicle.validInsurance;
          let stolen = results.vehicles[i].vehicle.isStolen;
          if (validRegistration=='1') plateResult.addFields({ name: `**Registration**`, value: `**Valid**`, inline: true });
          if (validRegistration=='2') plateResult.addFields({ name: `**Registration**`, value: `**InValid**`, inline: true });
          if (validInsurance=='1') plateResult.addFields({ name: `**Insurance**`, value: `**Valid**`, inline: true });
          if (validInsurance=='2') plateResult.addFields({ name: `**Insurance**`, value: `**InValid**`, inline: true });
          if (stolen=='1') plateResult.addFields({ name: `**Stolen**`, value: `**No**`, inline: true });
          if (stolen=='2') plateResult.addFields({ name: `**Stolen**`, value: `**Yes**`, inline: true });
          message.channel.send(plateResult);
        }
      }
      socket.disconnect();
    });
  }

  async firearmSearch(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (args.length==0) return message.channel.send(`You are missing a **Serial Number** ${message.author}`);
    let data = {
      user: user,
      query: {
        serialNumber: args[0],
        activeCommunityID: user.user.activeCommunity
      }
    }
    const socket = io.connect(this.config.socket);
    socket.emit('bot_firearm_search', data);
    socket.on('bot_firearm_search_results', results => {
      if (results.user._id==user._id) {
        if (results.firearms.length==0) {
          return message.channel.send(`No Firearms found ${message.author}`);
        }

        for (let i = 0; i < results.firearms.length; i++) {
          let firearmResult = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.firearms[i].firearm.serialNumber} | ${results.firearms[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
          .setDescription('Firearm Search Results')
          .addFields(
            { name: `**Serial Number**`, value: `**${results.firearms[i].firearm.serialNumber}**`, inline: true },
            { name: `**Type**`, value: `**${results.firearms[i].firearm.weaponType}**`, inline: true },
            { name: `**Owner**`, value: `**${results.firearms[i].firearm.registeredOwner}**`, inline: true },
          )
          // Other details
          let isStolen = results.firearms[i].firearm.isStolen;
          if (isStolen=="false"||isStolen==false) firearmResult.addFields({name:`**Stolen**`,value:'**No**',inline: true});
          if (isStolen=="true"||isStolen==true) firearmResult.addFields({name:`**Stolen**`,value:'**Yes**',inline: true});
          message.channel.send(firearmResult);
        }
      }
      socket.disconnect();
    });
  }

  async checkStatus(message, args) {
    if (args.length==0) {
      let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
      if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
      message.channel.send(`${message.author}'s status: ${user.user.dispatchStatus} | Set by: ${user.user.dispatchStatusSetBy}`);
    } else {
      let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
      if (!user) return message.channel.send(`Cannot find **${args[0]}** ${message.author}!`);
      // This lame line of code to get username without ping on discord
      const User = client.users.cache.get(args[0].replace('<@!', '').replace('>', ''));
      message.channel.send(`${message.author}, **${User.tag}'s** status: ${user.user.dispatchStatus} | Set by: ${user.user.dispatchStatusSetBy}`);
    }
  }

  async updateStatus(message, args, prefix) {
    let validStatus=['10-8','10-7','10-6','10-11','10-23','10-97','10-15','10-70','10-80', 'Panic', '10-41', '10-42'];
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
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
        message.channel.send(`Succesfully updated status to **${args[0]}** ${message.author}!`);
        socket.disconnect();
    });
  }

  async enablePanic(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    // If panic isn't enabled, enable panic
    if (user.user.dispatchStatus!='Panic') {
      this.updateStatus(message, ['Panic'], null);
      let myReq = {
        userID: user._id,
        userUsername: user.user.username,
        activeCommunity: user.user.activeCommunity
      }
      const socket = io.connect(this.config.socket);
      socket.emit('botping');
      socket.emit('panic_button_update', myReq);
      message.channel.send(`Enabled Panic ${message.author}!`);
    // If panic is enabled, set status to Online (panic off)
    } else if (user.user.dispatchStatus=='Panic') {
      let myReq = {
        userID: user._id,
        communityID: user.user.activeCommunity
      };
      const socket = io.connect(this.config.socket);
      socket.emit('clear_panic', myReq);

      let myUpdateReq = {
        userID: user._id,
        status: '10-8',
        setBy: 'System',
        onDuty: null,
        updateDuty: false
      };
      socket.emit('update_status', myUpdateReq);
      message.channel.send(`Disabled Panic ${message.author} and set status to 10-8.`);
    }
  }

  async getPrefix(message) {
    let prefix;
    if (message.channel.type!="dm") {
      let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);

      // If not prefix, generate server default
      if (!guild) {
        let newGuild = {
          server: {
            serverID: message.guild.id,
            prefix: this.config.defaultPrefix
          }
        }
        this.dbo.collection("prefixes").insertOne(newGuild, function(err, res) {
          if (err) throw err;
        });
        prefix = newGuild.server.serverID;
      } else prefix = guild.server.prefix;
    } else prefix = this.config.defaultPrefix;
    return prefix
  }

  main() {
    client.on('ready', () => {
      console.log(`Logged in as ${client.user.tag}`);
    });

    // Basic Commands
    client.on('message', (message) => {
      this.getPrefix(message).then(prefix => {
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
          .setAuthor('LPS Website & Bot Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
          .setDescription('Lines Police CAD Bot Commands')
          .addFields(
            { name: `**${prefix}help**`, value: 'Displays this help page', inline: true },
            { name: `**${prefix}ping**`, value: 'Responds with Pong to check Bot responce', inline: true },
            { name: `**${prefix}setPrefix** <new prefix>`, value: 'Sets new prefix (Admin only command)', inline: true },
            { name: `**${prefix}login** <email> <login token>`, value: 'Login to LPS account (DM only command)', inline: true },
            { name: `**${prefix}logout**`, value: 'Logs out of your current logged in account', inline: true },
            { name: `**${prefix}validStatus**`, value: 'Shows list of valid statuses to updade to', inline: true },
            { name: `**${prefix}checkStatus** <user>`, value: 'Leave user blank to check own status', inline: true },
            { name: `**${prefix}updateStatus** <status>`, value: 'Updates your status', inline: true },
            { name: `**${prefix}account**`, value: 'returns logged in account', inline: true },
            { name: `**${prefix}penalCodes**`, value: 'Provides Link to penal codes', inline: true },
            { name: `**${prefix}namedb <firstName> <lastName> <dob>**`, value: 'Searches in your community for name (dob only required if not in a community)', inline: true },
            { name: `**${prefix}platedb <licence plate #>**`, value: 'Searches in your community for Vehicles with the given Licence plate #', inline: true },
            { name: `**${prefix}firearmdb <Serial #>**`, value: 'Searches for Firearms with the given Serial #', inline: true },
            { name: `**${prefix}panic**`, value: 'Enables or disables your panic button', inline: true }
          )

        if (command == 'ping') message.channel.send('Pong!');
        if (command == 'help') message.channel.send(help);
        if (command == 'setprefix') {
          if (message.channel.type=="dm") return message.author.send(`You cannot set a prefix in a dm ${message.author}!`);
          if(!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
          this.newPrefix(message, args);
        }
        // Login
        if (command == 'login') {
          if (message.channel.type=="text") return message.channel.send(`You must direct message me to use this command ${message.author}!`);
          this.remoteLogin(message, args);
        }
        if (command == 'logout') this.remoteLogout(message);
        if (command == 'validstatus') message.channel.send(validStatus);
        if (command == 'checkstatus') this.checkStatus(message, args);
        if (command == 'updatestatus') this.updateStatus(message, args, prefix);
        if (command == 'account') this.account(message);
        if (command == 'penalcodes') return message.channel.send('https://www.linespolice-cad.com/penal-code');
        if (command == 'namedb') this.nameSearch(message, args);
        if (command == 'platedb') this.plateSearch(message, args);
        if (command == 'firearmdb') this.firearmSearch(message, args);
        if (command == 'panic') this.enablePanic(message);

        // Disabled for dev
        // if (command == 'createbolo') this.createBolo(message, args);

        // Dev Commands (not visible in help) && easter egg commands
        if (command == 'version') message.channel.send(`**LPS-BOT Version : ${this.dev}-${this.config.version}**`)
        if (command == 'whatisthemeaningoflife') message.channel.send('42');
        if (command == 'whatareyou' || command == 'whoareyou') message.channel.send('Im your friendly neighborhood Lines Police CAD Bot');
        if (command == 'whocreatedyou') message.channel.send('Lines Police CAD Developer McDazzzled | https://github.com/SowinskiBraeden');
        if (command == 'pingserver') {
          const socket = io.connect(this.config.socket);
          socket.emit('botping', {message:'hello there'});
          socket.on('botpong', (data) => {
            console.log(data);
            socket.disconnect();
          });
        }
      });
    });
    
    client.login(this.token);
  }
}

module.exports = {Bot};
