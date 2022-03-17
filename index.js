const LinesPoliceCadBot = require('./structures/LinesPoliceCadBot');
const config = require('./config/config');
const { Intents } = require('discord.js');

let client = new LinesPoliceCadBot({ intents:[Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]}, config);
client.build()
