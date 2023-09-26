const LinesPoliceCadBot = require('./structures/LinesPoliceCadBot');
const { GatewayIntentBits } = require('discord.js');
const config = require('./config/config');

let client = new LinesPoliceCadBot({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] }, config);
client.build()
