const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID
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
    if (n[0]==undefined) return message.channel.send(`You must provide a \`new prefix\` ${message.author}!`);
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
    if (args.length==0) return message.author.send(`You must provide a \`email\` and \`login token\` ${message.author}!`);
    if (!args[0]==null||!args[0]==undefined&&args[1]==null||args[1]==undefined) return message.author.send(`You must provide a \`login token\` ${message.author}!`);
    user = await this.dbo.collection("users").findOne({"user.email":args[0]}).then(user => user);
    if (user==null||user==undefined) return message.author.send(`Cannot find the email \`${args[0]}\` ${message.author}!`);

    // Check discord Token
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
          return message.author.send(`Logged in as \`${user.user.username}\` ${message.author}!`);
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
      if (args.length==0) return message.channel.send(`You must provide a \`First Name\`, \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}!`);
      if (args.length==1) return message.channel.send(`You're missing a \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}!`);
      if (args.length==2) return message.channel.send(`You're missing a \`DOB\`(yyyy-mm-dd) ${message.author}!`);
    }
    if (args.length==0) return message.channel.send(`You must provide a \`First Name\` and \`Last Name\` ${message.author}!`);
    if (args.length==1) return message.channel.send(`You're missing a \`Last Name\` ${message.author}!`);

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
          let nameResult = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.civilians[i].civilian.firstName} ${results.civilians[i].civilian.lastName} | ${results.civilians[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
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
          message.channel.send(nameResult);
        }
      }
      socket.disconnect();
    });
  }

  async plateSearch(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (args.length==0) return message.channel.send(`You are missing a \`Plate #\` ${message.author}`);
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
          return message.channel.send(`Plate Number \`${args[0]}\` not found ${message.author}`);
        }

        for (let i = 0; i < results.vehicles.length; i++) {
          let plateResult = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle(`**${results.vehicles[i].vehicle.plate} | ${results.vehicles[i]._id}**`)
          .setURL('https://discord.gg/jgUW656v2t')
          .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
          .setDescription('Plate Search Results')
          .addFields(
            { name: `**Plate #**`, value: `\`${results.vehicles[i].vehicle.plate}\``, inline: true },
            { name: `**Vin #**`, value: `\`${results.vehicles[i].vehicle.vin}\``, inline: true },
            { name: `**Model**`, value: `\`${results.vehicles[i].vehicle.model}\``, inline: true },
            { name: `**Color**`, value: `\`${results.vehicles[i].vehicle.color}\``, inline: true },
            { name: `**Owner**`, value: `\`${results.vehicles[i].vehicle.registeredOwner}\``, inline: true },
          )
          // Other details
          let validRegistration = results.vehicles[i].vehicle.validRegistration;
          let validInsurance = results.vehicles[i].vehicle.validInsurance;
          let stolen = results.vehicles[i].vehicle.isStolen;
          if (validRegistration=='1') plateResult.addFields({ name: `**Registration**`, value: `\`Valid\``, inline: true });
          if (validRegistration=='2') plateResult.addFields({ name: `**Registration**`, value: `\`InValid\``, inline: true });
          if (validInsurance=='1') plateResult.addFields({ name: `**Insurance**`, value: `\`Valid\``, inline: true });
          if (validInsurance=='2') plateResult.addFields({ name: `**Insurance**`, value: `\`InValid\``, inline: true });
          if (stolen=='1') plateResult.addFields({ name: `**Stolen**`, value: `\`No\``, inline: true });
          if (stolen=='2') plateResult.addFields({ name: `**Stolen**`, value: `\`Yes\``, inline: true });
          message.channel.send(plateResult);
        }
      }
      socket.disconnect();
    });
  }

  async firearmSearch(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (args.length==0) return message.channel.send(`You are missing a \`Serial Number\` ${message.author}`);
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
            { name: `**Serial Number**`, value: `\`${results.firearms[i].firearm.serialNumber}\``, inline: true },
            { name: `**Type**`, value: `\`${results.firearms[i].firearm.weaponType}\``, inline: true },
            { name: `**Owner**`, value: `\`${results.firearms[i].firearm.registeredOwner}\``, inline: true },
          )
          // Other details
          let isStolen = results.firearms[i].firearm.isStolen;
          if (isStolen=="false"||isStolen==false) firearmResult.addFields({name:`**Stolen**`,value:'\`No\`',inline: true});
          if (isStolen=="true"||isStolen==true) firearmResult.addFields({name:`**Stolen**`,value:'\`Yes\`',inline: true});
          message.channel.send(firearmResult);
        }
      }
      socket.disconnect();
    });
  }

  async checkStatus(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (user.user.activeCommunity == null) return message.channel.send(`You must join a community to use this command ${message.author}!`);
    if (args.length == 0) {
      message.channel.send(`${message.author}'s status: \`${user.user.dispatchStatus}\` | Set by: \`${user.user.dispatchStatusSetBy}\``);
    } else {
      let targetUserID = args[0].replace('<@!', '').replace('>', '');
      let targetUser = await this.dbo.collection("users").findOne({"user.discord.id":targetUserID}).then(user => user);
      // This lame line of code to get username without ping on discord
      const User = client.users.cache.get(args[0].replace('<@!', '').replace('>', ''));
      if (!targetUser) return message.channel.send(`Cannot find **${User.tag}** ${message.author}!`);
      if (targetUser.user.activeCommunity!=user.user.activeCommunity) {
        return message.channel.send(`You are not in the same community as \`${User.tag}\` ${message.author}!`);
      }
      return message.channel.send(`${message.author}, \`${User.tag}'s\` status: \`${targetUser.user.dispatchStatus}\` | Set by: \`${targetUser.user.dispatchStatusSetBy}\``);
    }
  }

  async updateStatus(message, args, prefix) {
    let validStatus=['10-8','10-7','10-6','10-11','10-23','10-97','10-15','10-70','10-80', 'Panic', '10-41', '10-42'];
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (user.user.activeCommunity==null) return message.channel.send(`You must join a community to use this command ${message.author}!`);
    if (args.length==0) return message.channel.send(`You must provide a new status ${message.author} | To see a list of valid statuses, use command \`${prefix}validStatus\`.`);
    if (!validStatus.includes(args[0])) return message.channel.send(`\`${args[0]}\` is a Invalid Status ${message.author}! To see a list of valid statuses, use command \`${prefix}validStatus\`.`);
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
      message.channel.send(`Succesfully updated status to \`${args[0]}\` ${message.author}!`);
      socket.disconnect();
    });
  }

  async enablePanic(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (user.user.activeCommunity==null) return message.channel.send(`You must join a community to use this command ${message.author}!`);
    const socket = io.connect(this.config.socket);
    // If panic is enabled, disable panic
    if (user.user.dispatchStatus=='Panic') {
      let myReq = {
        userID: user._id,
        communityID: user.user.activeCommunity
      };
      socket.emit('clear_panic', myReq);

      let myUpdateReq = {
        userID: user._id,
        status: '10-8',
        setBy: 'System',
        onDuty: null,
        updateDuty: false
      };
      socket.emit('bot_update_status', myUpdateReq);
      socket.on('bot_updated_status', (res) => { 
        message.channel.send(`Disabled Panic ${message.author} and set status to \`10-8\`.`);
        socket.disconnect();
      });
      return;
    // If panic is disabled, enable panic
    } else {
      this.updateStatus(message, ['Panic'], null);
      let myReq = {
        userID: user._id,
        userUsername: user.user.username,
        activeCommunity: user.user.activeCommunity
      }
      socket.emit('panic_button_update', myReq);
      socket.disconnect();
      let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
      if (guild.server.pingOnPanic) return message.channel.send(`Attention <@&${guild.server.pingRole}>! \`${user.user.username}\` has activated panic!`);
      return;
    }
  }

  async updateLicense(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    let data;
    if (user.user.activeCommunity=='' || user.user.activeCommunity==null) {
      if (args.length==0) return message.channel.send(`You must provide a \`License Status\`, \`First Name\`, \`Last Name\`, \`DOB\`(yyyy-mm-dd) ${message.author}!`);
      if (args.length==1) return message.channel.send(`You're missing a \`First Name\`, \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}!`);
      if (args.length==2) return message.channel.send(`You're missing a \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}!`);
      if (args.length==3) return message.channel.send(`You're missing a \`DOB\`(yyyy-mm-dd) ${message.author}!`);
      if (args[0].toLowerCase()!='revoke'&&args[0].toLowerCase()!='reinstate') return message.channel.send(`Invalid License Status, choose \`revoke\` or \`reinstate\` ${message.author}!`);
    }
    if (args.length==0) return message.channel.send(`You must provide a \`License Status\`, \`First Name\` and \`Last Name\` ${message.author}!`);
    if (args.length==1) return message.channel.send(`You're missing a \`First Name\` and \`Last Name\` ${message.author}!`);
    if (args.length==2) return message.channel.send(`You're missing a \`Last Name\` ${message.author}!`);
    if (args[0].toLowerCase()!='revoke'&&args[0].toLowerCase()!='reinstate') return message.channel.send(`Invalid License Status, choose \`revoke\` or \`reinstate\` ${message.author}!`);

    if (user.user.activeCommunity=='' || user.user.activeCommunity==null) {
      data = {
        user: user,
        query: {
          firstName: args[1],
          lastName: args[2],
          dateOfBirth: args[3],
          activeCommunityID: user.user.activeCommunity
        }
      }
    } else {
      data = {
        user: user,
        query: {
          firstName: args[1],
          lastName: args[2],
          activeCommunityID: user.user.activeCommunity
        }
      }
    }

    const socket = io.connect(this.config.socket);
    socket.emit("bot_name_search", data);
    socket.on("bot_name_search_results", (results) => {
      if (results.user._id==user._id) {
        if (results.civilians.length == 0) {
          return message.channel.send(`Name \`${args[1]} ${args[2]}\` not found ${message.author}`);
        }
      }

      let query = {
        _id: results.civilians[0]._id,
        status: null,
        bot_request: true
      };
      if (args[0]=='revoke') query.status = 2;
      if (args[0]=='reinstate') query.status = 1;
      socket.emit("update_drivers_license_status", query);
      socket.on("bot_updated_drivers_license_status", (res) => {
        if (!res.success) return message.channel.send(`Failed to update license of \`${args[1]} ${args[2]}\` ${message.author}`);
        message.channel.send(`Successfully updated license of \`${args[1]} ${args[2]}\` ${message.author}`);
        socket.disconnect();
        return;
      });
    });
  }

  async joinCommunity(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (args.length==0) return message.channel.send(`You must provide a \`Community Code\` ${message.author}!`);
    let myReq = {
      userID: user._id,
      communityCode: args[0]
    };
    const socket = io.connect(this.config.socket);
    socket.emit('bot_join_community', myReq);
    socket.on('bot_joined_community', (data) => {
      socket.disconnect()
      if (data.error) {
        return message.channel.send(`${data.error} ${message.author}!`);
      }
      return message.channel.send(`Successfully joined the community \` ${data.commName} \` ${message.author}`)
    });
  }

  async leaveCommunity(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    let myReq = {
      userID: user._id
    };
    const socket = io.connect(this.config.socket);
    socket.emit('bot_leave_community', myReq);
    socket.on('bot_left_community', (data) => {
      socket.disconnect()
      if (data.error) {
        return message.channel.send(`${data.error} ${message.author}!`);
      }
      return message.channel.send(`${data.message} ${message.author}`)
    });
  }

  async community(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}!`);
    if (user.user.activeCommunity==null) return message.channel.send(`You are not in a community ${message.author}!`);
    let community = await this.dbo.collection("communities").findOne({_id:ObjectId(user.user.activeCommunity)}).then(community => community);
    if (!community) return message.channel.send(`Community not found ${message.author}!`);
    return message.channel.send(`You are in the community \`${community.community.name}\` ${message.author}!`);
  }

  async setRole(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a role ${message.author}!`);
    let roleid = args[0].replace('<@&', '').replace('>', '');
    let role = message.guild.roles.cache.find(x => x.id == roleid);
    if (role == undefined) {
      return message.channel.send(`Uh Oh! The role ${args[0]} connot be found.`);
    } else {
      let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
      if (guild.server.allowedRole!=undefined&&guild.server.allowedRoles.includes(roleid)) return message.channel.send(`The role ${args[0]} has already been added ${message.author}!`);
      this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$push:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":true}},function(err, res) {
        if (err) throw err;
        return message.channel.send(`Successfully added ${args[0]} to allowed roles ${message.author}!`);
      });
    }
  }

  async removeRole(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a role ${message.author}!`);
    let roleid = args[0].replace('<@&', '').replace('>', '');
    let role = message.guild.roles.cache.find(x => x.id == roleid);
    if (role == undefined) {
      return message.channel.send(`Uh Oh! The role ${args[0]} connot be found.`);
    } else {
      let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
      if (guild.server.hasCustomRoles==false) return message.channel.send(`There are no roles to be removed ${message.author}!`);
      if (!guild.server.allowedRoles.includes(roleid)) return message.channel.send(`The role ${args[0]} is not added to your roles ${message.author}!`);
      for (let i = 0; i < guild.server.allowedRoles.length; i++) {
        if (guild.server.allowedRoles[i]==roleid) {
          if ((guild.server.allowedRoles.length-1)==0) {
            this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":false}},function(err, res) {
              if (err) throw err;
              return message.channel.send(`Successfully removed ${args[0]} from allowed roles ${message.author}! There are no more allowed roles.`);
            });  
          } else if ((guild.server.allowedRoles.length-1)>0) {
            this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedRoles":roleid}},function(err, res) {
              if (err) throw err;
              return message.channel.send(`Successfully removed ${args[0]} from allowed roles ${message.author}!`);
            });
          }
        }
      }
    }
  }

  async roles(message) {
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.hasCustomRoles==false) {
      return message.channel.send('There are no roles set for the bot.');
    }

    let roles = "Allowed Roles:";
    for (let i = 0; i < guild.server.allowedRoles.length; i++) {
      if (guild.server.allowedRoles[i] == undefined) break;
      roles += `\n<@&${guild.server.allowedRoles[i]}>`;
    }
    return message.channel.send(roles);
  }

  async setChannel(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a channel ${message.author}!`);
    let channelid = args[0].replace('<#', '').replace('>', '');
    let channel = client.channels.cache.get(channelid);
    if (!channel) return message.channel.send(`Cannot find that channel ${message.author}!`);
    if (channel.type=="voice") return message.channel.send(`Connot set voice channel to preferred channel ${message.author}!`);
    if (channel.deleted) return message.channel.send(`Connot set deleted channel to preferred channel ${message.author}!`);
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.allowedChannels!=undefined&&guild.server.allowedChannels.includes(channelid)) return message.channel.send(`The channel ${args[0]} has already been added ${message.author}!`);
    this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$push:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":true}},function(err, res) {
      if (err) throw err;
      return message.channel.send(`Successfully added ${args[0]} to allowed channels ${message.author}!`);
    });
  }

  async removeChannel(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a channel ${message.author}!`);
    let channelid = args[0].replace('<#', '').replace('>', '');
    let channel = client.channels.cache.get(channelid);
    if (!channel) return message.channel.send(`Uh Oh! The channel ${args[0]} connot be found.`);
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.hasCustomChannels==false) return message.channel.send(`There are no channels to be removed ${message.author}!`);
    if (!guild.server.allowedChannels.includes(channelid)) return message.channel.send(`The channel ${args[0]} is not added to your roles ${message.author}!`);
    for (let i = 0; i < guild.server.allowedChannels.length; i++) {
      if (guild.server.allowedChannels[i]==channelid) {
        if ((guild.server.allowedChannels.length-1)==0) {
          this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":false}},function(err, res) {
            if (err) throw err;
            return message.channel.send(`Successfully removed ${args[0]} from allowed channels ${message.author}! There are no more allowed channels.`);
          });  
        } else if ((guild.server.allowedChannels.length-1)>0) {
          this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$pull:{"server.allowedChannels":channelid}},function(err, res) {
            if (err) throw err;
            return message.channel.send(`Successfully removed ${args[0]} from allowed channels ${message.author}!`);
          });
        }
      }
    }
  }

  async channels(message) {
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.hasCustomChannels==false) {
      return message.channel.send('There are no channels set for the bot.');
    }

    let channels = "Allowed Channels:";
    for (let i = 0; i < guild.server.allowedChannels.length; i++) {
      if (guild.server.allowedChannels[i] == undefined) break;
      channels += `\n<#${guild.server.allowedChannels[i]}>`;
    }
    return message.channel.send(channels);
  }

  async getGuildPresets(message) {
    let prefix;
    let channelId;
    let customRoleStatus;
    let customChannelStatus;
    let allowedChannels;
    if (message.channel.type!="dm") {
      let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);

      // If guild not found, generate guild default
      if (!guild) {
        let newGuild = {
          server: {
            serverID: message.guild.id,
            prefix: this.config.defaultPrefix,
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
    } else {
      prefix = this.config.defaultPrefix;
      customRoleStatus = false;
      customChannelStatus = false;
      allowedChannels = null;
    }
    return {prefix, channelId, customRoleStatus, customChannelStatus, allowedChannels};
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

  async togglePingOnPanic(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a \`Ping On Role Status\` and a \`role\` to ping ${message.author}!`);  
    if (args[0]=="false") {
      // disable ping on panic and remove ping role
      this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.pingOnPanic":false,"server.pingRole":null}},function(err, res) {
        if (err) throw err;
        return message.channel.send(`Successfully disabled ping role on panic ${message.author}!`);
      });
    } else if (args[0]=="true") {
      let roleid = args[1].replace('<@&', '').replace('>', '');
      let role = message.guild.roles.cache.find(x => x.id == roleid);
      if (role == undefined) {
        return message.channel.send(`Uh Oh! The role ${args[1]} connot be found.`);
      } else {
        this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.pingRole":roleid,"server.pingOnPanic":true}},function(err, res) {
          if (err) throw err;
          return message.channel.send(`Successfully set ${args[1]} to be pinged on panic ${message.author}!`);
        });
      }
    } else return message.channel.send(`\`${args[0]}\` is an invalid status, use \`true\` or \`false\` ${message.author}!`);
  }

  async getPingOnPanicStatus(message) {
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    return message.channel.send(`Current Ping on Panic Status: ${guild.server.pingOnPanic} ${message.author}`);
  }

  main() {
    client.on('ready', () => {
      console.log(`Logged in as ${client.user.tag}`);
    });

    // Basic Commands
    client.on('message', async (message) => {
      let { prefix, channelId, customRoleStatus, customChannelStatus, allowedChannels } = await this.getGuildPresets(message);
      if (!message.content.startsWith(prefix) || message.author.bot) return;

      if (customChannelStatus==true&&!allowedChannels.includes(message.channel.id)) {
        return message.channel.send(`This is not the preferred channel, please one of the allowed channels. Use \`${prefix}channels\` to see a list of allowed channels ${message.author}!`);
      }
      const args = message.content.slice(prefix.length).trim().split(' ');
      const command = args.shift().toLowerCase();

      // Valid Statuses Embed
      const validStatus = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Lines Police CAD')
        .setURL('https://www.linespolice-cad.com/')
        .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
        .setDescription('Valid Statuses')
        .addFields(
          { name: 'Statuses:', value: `
            10-8   |  \`On Duty\`
            10-7   |  \`Off Duty\`
            10-6   |  \`Busy\`
            10-11  |  \`Traffic Stop\`
            10-23  |  \`Arrive on Scene\`
            10-97  |  \`In Route\`
            10-15  |  \`Subject in Custody\`
            10-70  |  \`Foot Pursuit\`
            10-80  |  \`Vehicle Pursiut\`
            `
          }    
        )

      // Help Embed
      const help = new Discord.MessageEmbed()
        .setColor('#0099ff')
        .setTitle('**Commands:**')
        .setURL('https://discord.gg/w2g2FFmHbF')
        .setAuthor('LPS Website & Bot Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
        .setDescription('Lines Police CAD Bot Commands')
        .addFields({
          name: `**__Bot Commands:__**`,
          value: `
          **${prefix}help** - \`Displays this help page\`
          **${prefix}stats** - \`Displays current Bot statistics\`
          **${prefix}ping** - \`Responds with Pong to check Bot responce\`
          `,
          inline: false
        },
        {
          name: `**__LPC Commands (1/2):__**`,
          value: `
          **${prefix}login** <email> <login token> - \`Login to LPS account (DM only command)\`
          **${prefix}logout** - \`Logs out of your current logged in account\`
          **${prefix}validStatus** - \`Shows list of valid statuses to updade to\`
          **${prefix}checkStatus** <user> - \`Check your own or other status\`
          **${prefix}updateStatus** <status> - \`Updates your status\`
          **${prefix}account** - \`returns logged in account\`
          **${prefix}penalCodes** - \`Provides Link to penal codes\`
          **${prefix}namedb** <firstName> <lastName> <dob> - \`Searches for Civilian by Name\`
          **${prefix}platedb** <licence plate #> - \`Searches for Vehicle by Licence Plate #\`
          **${prefix}firearmdb** <Serial #> - \`Searches for Firearms by Serial #\`
          **${prefix}panic** - \`Enables/Disables your panic button\`
          **${prefix}license** <revoke|reinstate> <firstName> <lastName> <dob> - \`Revoke/Reinstate License\`
          `,
          inline: true
        },
        {
          name: `**__LPC Command (2/2):__**`,
          value: `
          **${prefix}roles** - \`Shows a list of allowed roles\`
          **${prefix}channels** - \`Shows a list of allowed channels\`
          **${prefix}joincommunity** <community code> - \`Joins a community with the given code\`
          **${prefix}leavecommunity** - \`Leaves your current active community\`
          **${prefix}community** - \`Returns the name of the Community your currenty in\`
          `,
          inline: false
        },
        {
          name: `**__Admin Commands:__**`,
          value: `
          **${prefix}setPrefix** <new prefix> - \`Sets new prefix\`
          **${prefix}setChannel** <channel> - \`Adds channel to list of allowed channels\`
          **${prefix}removeChannel** <channel> - \`Removes channel from list of allowed channels\`
          **${prefix}setRole** <role> - \`Adds role to list of allowed roles\`
          **${prefix}removeRole** <role> - \`Removes role from list of allowed roles\`
          **${prefix}togglePingOnPanic** <true|false> <role> - \`Enable/disable ping role on panic\`
          `,
          inline: false
        })

      const stats = new Discord.MessageEmbed()
          .setColor('#0099ff')
          .setTitle("Current LPC-Bot Statistics")
          .setURL('https://discord.gg/w2g2FFmHbF')
          .addField(" \u200B ", "**Channels** : ` " + `${client.channels.cache.size}` + " `")
          .addField(" \u200B ", "**Servers** : ` " + `${client.guilds.cache.size}` + " `")
          .addField(" \u200B ", "**Users** : ` " + `${client.users.cache.size}` + " `")

      if (command == 'ping') message.channel.send('Pong!');
      if (command == 'help') message.channel.send(help);
      if (command == 'stats') message.channel.send(stats);
      if (command == 'setprefix') {
        if (message.channel.type=="dm") return message.author.send(`You cannot set a prefix in a dm ${message.author}!`);
        if(!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
        this.newPrefix(message, args);
      }
      if (command == 'setchannel') {
        if (message.channel.type=="dm") return message.author.send(`You cannot set a channel in a dm ${message.author}!`);
        if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
        this.setChannel(message, args);
      }
      if (command == 'removechannel') {
        if (message.channel.type=="dm") return message.author.send(`You cannot remove a channel in a dm ${message.author}!`);
        if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
        this.removeChannel(message, args); 
      }
      if (command == 'setrole') {
        if (message.channel.type=="dm") return message.author.send(`You cannot set a role in a dm ${message.author}!`);
        if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
        this.setRole(message, args); 
      }
      if (command == 'removerole') {
        if (message.channel.type=="dm") return message.author.send(`You cannot remove a role in a dm ${message.author}!`);
        if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
        this.removeRole(message, args); 
      }
      if (command == 'togglepingonpanic') {
        if (message.channel.type=="dm") return message.author.send(`You cannot remove a role in a dm ${message.author}!`);
        if (!message.member.hasPermission(["ADMINISTRATOR","MANAGE_GUILD"])) return message.channel.send(`You don't have permission to used this command ${message.author}`);
        this.togglePingOnPanic(message, args);
      }
      if (command == 'roles') {
        if (message.channel.type=="dm") return message.author.send(`You cannot see allowed roles in a dm ${message.author}!`);
        this.roles(message);
      }
      if (command == 'channels') {
        if (message.channel.tpye=="dm") return message.channel.send(`You cannot see allowed channels in a dm ${message.author}!`);
        this.channels(message);
      }
      if (command == 'pingonpanic') {
        if (message.channel.type=="dm") return message.channel.send(`You cannot see allowed channels in a dm ${message.author}!`);
        this.getPingOnPanicStatus(message);
      }

      // Login
      if (command == 'login') {
        if (message.channel.type=="text") return message.channel.send(`You must direct message me to use this command ${message.author}!`);
        this.remoteLogin(message, args);
      }
      if (command == 'logout') this.remoteLogout(message);
      if (command == 'validstatus') message.channel.send(validStatus);
      if (command == 'checkstatus') {
        if (customRoleStatus) {
          let hasRole = await this.checkRoleStatus(message);
          if (hasRole) {
            this.checkStatus(message, args);
          } else return message.channel.send(`You don't have permission to use this command ${message.author}!`);
        } else this.checkStatus(message, args);
      }
      if (command == 'updatestatus') {
        if (customRoleStatus) {
          let hasRole = await this.checkRoleStatus(message);
          if (hasRole) {
            this.updateStatus(message, args, prefix);
          } else return message.channel.send(`You don't have permission to use this command ${message.author}!`);
        } else this.updateStatus(message, args, prefix);
      }
      if (command == 'account') this.account(message);
      if (command == 'penalcodes') return message.channel.send('https://www.linespolice-cad.com/penal-code');
      if (command == 'namedb') {
        if (customRoleStatus) {
          let hasRole = await this.checkRoleStatus(message);
          if (hasRole) {
            this.nameSearch(message, args);
          } else return message.channel.send(`You don't have permission to use this command ${message.author}!`);
        } else this.nameSearch(message, args);
      }
      if (command == 'platedb') {
        if (customRoleStatus) {
          let hasRole = await this.checkRoleStatus(message);
          if (hasRole) {
            this.plateSearch(message, args);
          } else return message.channel.send(`You don't have permission to use this command ${message.author}!`);
        } else this.plateSearch(message, args);
      }
      if (command == 'firearmdb') {
        if (customRoleStatus) {
          let hasRole = await this.checkRoleStatus(message);
          if (hasRole) {
            this.firearmSearch(message, args);
          } else return message.channel.send(`You don't have permission to use this command ${message.author}!`);
        } else this.firearmSearch(message, args);
      }
      if (command == 'panic') {
        if (customRoleStatus) {
          let hasRole = await this.checkRoleStatus(message);
          if (hasRole) {
            this.enablePanic(message);
          } else return message.channel.send(`You don't have permission to use this command ${message.author}!`);
        } else this.enablePanic(message);
      }
      if (command == 'license') {
        if (customRoleStatus) {
          let hasRole = await this.checkRoleStatus(message);
          if (hasRole) {
            this.updateLicense(message, args);
          } else return message.channel.send(`You don't have permission to use this command ${message.author}! `);
        } else this.updateLicense(message, args);
      }
      if (command == 'joincommunity') this.joinCommunity(message, args);
      if (command == 'leavecommunity') this.leaveCommunity(message);
      if (command == 'community') this.community(message);

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
    client.login(this.token);
  }
}

module.exports = {Bot};
