const MongoClient = require('mongodb').MongoClient;
const bcrypt = require('bcrypt');
const socket = require('socket.io');
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
        `
      },
      { name: '\u200B', value: '\u200B' }
    )

  if (command == 'ping') message.channel.send('pong');
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
});

client.login(config.token);