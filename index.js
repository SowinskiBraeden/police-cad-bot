const Bot = require('./LPS').Bot;

client = new bot('PRODUCTION', process.env.token);
client.main()
