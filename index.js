const Bot = require('./LPS').Bot;

client = new Bot('PRODUCTION', process.env.token, './config', process.env.mongoURI, process.env.dbo);
client.main()
