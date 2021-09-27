const Bot = require('./LPS').Bot;

client = new Bot('PRODUCTION', process.env.token, './config');
client.main()
