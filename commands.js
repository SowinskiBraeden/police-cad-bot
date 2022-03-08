/*
HEY YOU! YEAH YOU!
If you are looking at this file,
that means I am not done, and this is 
all the old code for commands that I need
to refactor to be up to date with modern
discord.js bot structure utilizing the 
slash command support. So just ignore this
file for now, its just all the old command
logic.
*/


const MongoClient = require('mongodb').MongoClient;
const { MessageEmbed } = require("discord.js");
const ObjectId = require('mongodb').ObjectID
const randomstring = require('randomstring');
const io = require('socket.io-client');

class Commands {

	constructor(config, mongoURI, dbo) {
		this.config = config;
		this.connectMongo(mongoURI, dbo);
  }

  async connectMongo(mongoURI, dbo) {
    this.db = await MongoClient.connect(mongoURI,{useUnifiedTopology:true});
    this.dbo = this.db.db(dbo);
  }

  // Updates Prefix
  async newPrefix(message, n) {
    if (n[0]==undefined) return message.channel.send(`You must provide a \`new prefix\` ${message.author}`);
    if (n[0].length<1) return message.channel.send('Your new prefix must be \`1\` character!')
    this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.prefix":n[0]}},function(err, res) {
      if (err) throw err;
      message.channel.send(`The new prefix is now **\`${n}\`**`);
    });
  }

  // Remote Login
  async remoteLogin(message, args) {
    return message.channel.send('Login from Lines Police CAD account management https://www.linespolice-cad.com/');
  }

  async remoteLogout(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You cannot logout if your not logged in ${message.author}`);
    this.dbo.collection("users").updateOne({"user.discord.id":message.author.id},{$unset:{"user.discord":""}, $set:{"user.discordConnected":false}},function(err,res) {
      if (err) throw err;
      message.channel.send(`Succesfully disconnected you Discord account ${message.author}`);
    });
  }

  async account(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (user==null) return message.channel.send(`You are not logged in ${message.author}`);
    message.author.send(`${message.author} Logged in as **${user.user.username}**  |  **${user.user.email}**`);
  }

  async nameSearch(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    let data;
    if (user.user.activeCommunity=='' || user.user.activeCommunity==null) {
      if (args.length==0) return message.channel.send(`You must provide a \`First Name\`, \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}`);
      if (args.length==1) return message.channel.send(`You're missing a \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}`);
      if (args.length==2) return message.channel.send(`You're missing a \`DOB\`(yyyy-mm-dd) ${message.author}`);
    }
    if (args.length==0) return message.channel.send(`You must provide a \`First Name\` and \`Last Name\` ${message.author}`);
    if (args.length==1) return message.channel.send(`You're missing a \`Last Name\` ${message.author}`);

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
          let nameResult = new MessageEmbed()
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
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
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
          let plateResult = new MessageEmbed()
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
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
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
          let firearmResult = new MessageEmbed()
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
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    if (user.user.activeCommunity == null) return message.channel.send(`You must join a community to use this command ${message.author}`);
    if (args.length == 0) {
      message.channel.send(`${message.author}'s status: \`${user.user.dispatchStatus}\` | Set by: \`${user.user.dispatchStatusSetBy}\``);
    } else {
      let targetUserID = args[0].replace('<@!', '').replace('>', '');
      let targetUser = await this.dbo.collection("users").findOne({"user.discord.id":targetUserID}).then(user => user);
      // This lame line of code to get username without ping on discord
      const User = client.users.cache.get(args[0].replace('<@!', '').replace('>', ''));
      if (!targetUser) return message.channel.send(`Cannot find **${args[0]}** ${message.author}`);
      if (targetUser.user.activeCommunity!=user.user.activeCommunity) {
        return message.channel.send(`You are not in the same community as \`${User.tag}\` ${message.author}`);
      }
      return message.channel.send(`${message.author}, \`${User.tag}'s\` status: \`${targetUser.user.dispatchStatus}\` | Set by: \`${targetUser.user.dispatchStatusSetBy}\``);
    }
  }

  async updateStatus(message, args, prefix) {
    let validStatus=['10-8','10-7','10-6','10-11','10-23','10-97','10-15','10-70','10-80', 'Panic', '10-41', '10-42'];
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    if (user.user.activeCommunity==null) return message.channel.send(`You must join a community to use this command ${message.author}`);
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
      message.channel.send(`Succesfully updated status to \`${args[0]}\` ${message.author}`);
      socket.disconnect();
    });
  }

  async enablePanic(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    if (user.user.activeCommunity==null) return message.channel.send(`You must join a community to use this command ${message.author}`);
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
      if (guild.server.pingOnPanic) return message.channel.send(`Attention <@&${guild.server.pingRole}>! \`${user.user.username}\` has activated panic`);
      return;
    }
  }

  async updateLicense(message, args) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    let data;
    if (user.user.activeCommunity=='' || user.user.activeCommunity==null) {
      if (args.length==0) return message.channel.send(`You must provide a \`License Status\`, \`First Name\`, \`Last Name\`, \`DOB\`(yyyy-mm-dd) ${message.author}`);
      if (args.length==1) return message.channel.send(`You're missing a \`First Name\`, \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}`);
      if (args.length==2) return message.channel.send(`You're missing a \`Last Name\` and \`DOB\`(yyyy-mm-dd) ${message.author}`);
      if (args.length==3) return message.channel.send(`You're missing a \`DOB\`(yyyy-mm-dd) ${message.author}`);
      if (args[0].toLowerCase()!='revoke'&&args[0].toLowerCase()!='reinstate') return message.channel.send(`Invalid License Status, choose \`revoke\` or \`reinstate\` ${message.author}`);
    }
    if (args.length==0) return message.channel.send(`You must provide a \`License Status\`, \`First Name\` and \`Last Name\` ${message.author}`);
    if (args.length==1) return message.channel.send(`You're missing a \`First Name\` and \`Last Name\` ${message.author}`);
    if (args.length==2) return message.channel.send(`You're missing a \`Last Name\` ${message.author}`);
    if (args[0].toLowerCase()!='revoke'&&args[0].toLowerCase()!='reinstate') return message.channel.send(`Invalid License Status, choose \`revoke\` or \`reinstate\` ${message.author}`);

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
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    if (args.length==0) return message.channel.send(`You must provide a \`Community Code\` ${message.author}`);
    let myReq = {
      userID: user._id,
      communityCode: args[0]
    };
    const socket = io.connect(this.config.socket);
    socket.emit('bot_join_community', myReq);
    socket.on('bot_joined_community', (data) => {
      socket.disconnect()
      if (data.error) {
        return message.channel.send(`${data.error} ${message.author}`);
      }
      return message.channel.send(`Successfully joined the community \` ${data.commName} \` ${message.author}`)
    });
  }

  async leaveCommunity(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    let myReq = {
      userID: user._id
    };
    const socket = io.connect(this.config.socket);
    socket.emit('bot_leave_community', myReq);
    socket.on('bot_left_community', (data) => {
      socket.disconnect()
      if (data.error) {
        return message.channel.send(`${data.error} ${message.author}`);
      }
      return message.channel.send(`${data.message} ${message.author}`)
    });
  }

  async community(message) {
    let user = await this.dbo.collection("users").findOne({"user.discord.id":message.author.id}).then(user => user);
    if (!user) return message.channel.send(`You are not logged in ${message.author}`);
    if (user.user.activeCommunity==null) return message.channel.send(`You are not in a community ${message.author}`);
    let community = await this.dbo.collection("communities").findOne({_id:ObjectId(user.user.activeCommunity)}).then(community => community);
    if (!community) return message.channel.send(`Community not found ${message.author}`);
    return message.channel.send(`You are in the community \`${community.community.name}\` ${message.author}`);
  }

  async setRole(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a role ${message.author}`);
    let roleid = args[0].replace('<@&', '').replace('>', '');
    let role = message.guild.roles.cache.find(x => x.id == roleid);
    if (role == undefined) {
      return message.channel.send(`Uh Oh! The role ${args[0]} connot be found.`);
    } else {
      let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
      if (guild.server.allowedRole!=undefined&&guild.server.allowedRoles.includes(roleid)) return message.channel.send(`The role ${args[0]} has already been added ${message.author}`);
      this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$push:{"server.allowedRoles":roleid},$set:{"server.hasCustomRoles":true}},function(err, res) {
        if (err) throw err;
        return message.channel.send(`Successfully added ${args[0]} to allowed roles ${message.author}`);
      });
    }
  }

  async removeRole(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a role ${message.author}`);
    let roleid = args[0].replace('<@&', '').replace('>', '');
    let role = message.guild.roles.cache.find(x => x.id == roleid);
    if (role == undefined) {
      return message.channel.send(`Uh Oh! The role ${args[0]} connot be found.`);
    } else {
      let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
      if (guild.server.hasCustomRoles==false) return message.channel.send(`There are no roles to be removed ${message.author}`);
      if (!guild.server.allowedRoles.includes(roleid)) return message.channel.send(`The role ${args[0]} is not added to your roles ${message.author}`);
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
              return message.channel.send(`Successfully removed ${args[0]} from allowed roles ${message.author}`);
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
    if (args.length==0) return message.channel.send(`You must provide a channel ${message.author}`);
    let channelid = args[0].replace('<#', '').replace('>', '');
    let channel = client.channels.cache.get(channelid);
    if (!channel) return message.channel.send(`Cannot find that channel ${message.author}`);
    if (channel.type=="voice") return message.channel.send(`Connot set voice channel to preferred channel ${message.author}`);
    if (channel.deleted) return message.channel.send(`Connot set deleted channel to preferred channel ${message.author}`);
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.allowedChannels!=undefined&&guild.server.allowedChannels.includes(channelid)) return message.channel.send(`The channel ${args[0]} has already been added ${message.author}`);
    this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$push:{"server.allowedChannels":channelid},$set:{"server.hasCustomChannels":true}},function(err, res) {
      if (err) throw err;
      return message.channel.send(`Successfully added ${args[0]} to allowed channels ${message.author}`);
    });
  }

  async removeChannel(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a channel ${message.author}`);
    let channelid = args[0].replace('<#', '').replace('>', '');
    let channel = client.channels.cache.get(channelid);
    if (!channel) return message.channel.send(`Uh Oh! The channel ${args[0]} connot be found.`);
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    if (guild.server.hasCustomChannels==false) return message.channel.send(`There are no channels to be removed ${message.author}`);
    if (!guild.server.allowedChannels.includes(channelid)) return message.channel.send(`The channel ${args[0]} is not added to your roles ${message.author}`);
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
            return message.channel.send(`Successfully removed ${args[0]} from allowed channels ${message.author}`);
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

  async togglePingOnPanic(message, args) {
    if (args.length==0) return message.channel.send(`You must provide a \`Ping On Role Status\` and a \`role\` to ping ${message.author}`);  
    if (args[0]=="false") {
      // disable ping on panic and remove ping role
      this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.pingOnPanic":false,"server.pingRole":null}},function(err, res) {
        if (err) throw err;
        return message.channel.send(`Successfully disabled ping role on panic ${message.author}`);
      });
    } else if (args[0]=="true") {
      if (!args[1]) return message.channel.send(`You must provide a \`role\` to ping ${message.author}`);
      let roleid = args[1].replace('<@&', '').replace('>', '');
      let role = message.guild.roles.cache.find(x => x.id == roleid);
      if (role == undefined) {
        return message.channel.send(`Uh Oh! The role ${args[1]} connot be found.`);
      } else {
        this.dbo.collection("prefixes").updateOne({"server.serverID":message.guild.id},{$set:{"server.pingRole":roleid,"server.pingOnPanic":true}},function(err, res) {
          if (err) throw err;
          return message.channel.send(`Successfully set ${args[1]} to be pinged on panic ${message.author}`);
        });
      }
    } else return message.channel.send(`\`${args[0]}\` is an invalid status, use \`true\` or \`false\` ${message.author}`);
  }

  async getPingOnPanicStatus(message) {
    let guild = await this.dbo.collection("prefixes").findOne({"server.serverID":message.guild.id}).then(guild => guild);
    return message.channel.send(`Current Ping on Panic Status: ${guild.server.pingOnPanic} ${message.author}`);
  }
}

module.exports = {Commands};