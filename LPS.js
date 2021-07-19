const MongoClient = require('mongodb').MongoClient;
const io = require('socket.io-client');
const bcrypt = require('bcrypt');
const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config');
let data = require('./data');

// Updates prefix
async function newPrefix(message, n) {
  if (!n) return message.channel.send(`You must provide a **new prefix** ${message.author}!`);
  if (n[0].length<1) return message.channel.send('Your new prefix must be \`1\` character!')
  for (let i=0;i<Object.keys(data.customPrefix).length;i++) {
    if (Object.keys(data.customPrefix)[i]==message.guild.id) {
      delete data.customPrefix[i];
      data.customPrefix[message.guild.id] = n[0];
    }
  }
  message.channel.send(`The new prefix is now **\`${n}\`**`);
}

// Remote Login
async function remoteLogin(message, args) {
  if (data.userAcc.hasOwnProperty(message.author)) return message.author.send(`You are already logged in ${message.author}!`);
  if (args.length==0) return message.author.send(`You must provide a **email** and **password** ${message.author}!`);
  if (!args[0]==null||!args[0]==undefined&&args[1]==null||args[1]==undefined) return message.author.send(`You must provide a **password** ${message.author}!`);

  MongoClient.connect(config.mongoURI,{useUnifiedTopology:true},function(err, db) {
    if (err) throw err;
    let dbo = db.db("knoldus");
    dbo.collection("users").findOne({"user.email":args[0]}, function(err, result) {
      if (err) throw err;
      if (result==null||result==undefined) return message.author.send(`Cannot find the email **${args[0]}** ${message.author}!`);
      
      // Match Password
      bcrypt.compare(args[1], result.user.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            // Log in data.json Discord is linked to this email for LPS
            data.userAcc[message.author] = result.user.email;
            return message.author.send(`Logged in as **${result.user.username}** ${message.author}!`);
          } else {
            return message.author.send(`Incorrect password for **${args[0]}** ${message.author}!`);            
          }
        });
      db.close();
    });
  });
}

async function remoteLogout(message) {
  if (!data.userAcc.hasOwnProperty(message.author)) return message.channel.send(`You cannot logout if your not logged in ${message.author}!`);
  for (let i=0;i<Object.keys(data.userAcc).length;i++) {
    if (Object.keys(data.userAcc)[i]==`<@${message.author.id}>`) {
      delete data.userAcc[i];
      return message.channel.send(`Succesfully logged out ${message.author}!`);
    }
  }
}

async function getUser(message) {
  if (!data.userAcc.hasOwnProperty(message.author)) return null;
  for (let i=0;i<Object.keys(data.userAcc).length;i++) {
    if (Object.keys(data.userAcc)[i]==`<@${message.author.id}>`) {
      let db = await MongoClient.connect(config.mongoURI,{useUnifiedTopology:true});
      let dbo=db.db("knoldus");
      return await dbo.collection("users").findOne({"user.email":Object.values(data.userAcc)[i]}).then(user => user);
    }
  }
}

async function checkStatus(message) {
  getUser(message).then(user => {
    if (user==null) return message.channel.send(`You are not logged in ${message.author}!`);
    return message.channel.send(`${message.author}'s status: ${user.user.dispatchStatus} | Set by: ${user.user.dispatchStatusSetBy}`);
  });
}

async function updateStatus(message, args, prefix) {
  let validStatus=['10-8','10-7','10-6','10-11','10-23','10-97','10-15','10-70','10-80'];
  getUser(message).then(user => {
    if (user==null) return message.channel.send(`You are not logged in ${message.author}!`);
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
    const socket = io.connect('http://localhost:8080');
    socket.emit('bot_update_status', req);
    socket.on('bot_updated_status', (res) => {
        return message.channel.send(`Succesfully updated status to **${args[0]}** ${message.author}!`);
    });
  });
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Basic Commands
client.on('message', (message) => {
  // Prefix Setup
  let prefix;
  if (!message.channel.type=="dm") {
    // If no prefix, generate server default
    if (!data.customPrefix.hasOwnProperty(message.guild.id)) data.customPrefix[message.guild.id]=config.defaultPrefix;
    for (let i=0;i<Object.keys(data.customPrefix).length;i++) {
      if (Object.keys(data.customPrefix)[i]==message.guild.id) prefix=Object.values(data.customPrefix)[i];
    }
  } else prefix=config.defaultPrefix;

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
    .setTitle('Lines Police CAD')
    .setURL('https://www.linespolice-cad.com/')
    .setAuthor('LPS Website Support', 'https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png', 'https://discord.gg/jgUW656v2t')
    .setDescription('Lines Police CAD Bot portal Help')
    .addFields(
      { name: 'Commands:', value: `
        ${prefix}help  :  Displays this help page
        ${prefix}ping  :  Responds with Pong to check Bot responce
        ${prefix}setPrefix <new prefix>  :  Sets new prefix
        ${prefix}login <email> <password>  :  Login to LPS account (DM only command)
        ${prefix}logout  :  Logs out of your current logged in account
        ${prefix}validStatus  :  Shows list of valid statuses to updade to
        ${prefix}checkStatus  :  Checks your current status
        ${prefix}updateStatus <status>  :  Updates your status
        `
      }    
    )

  if (command == 'ping') message.channel.send('Pong!');
  if (command == 'help') message.channel.send(help);
  if (command == 'whatisthemeaningoflife') message.channel.send('42');
  if (command == 'setprefix') {
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
  if (command == 'checkstatus') checkStatus(message);
  if (command == 'updatestatus') updateStatus(message, args, prefix);
});

client.login(config.token);