const Bot = require('./LPS').Bot;

let client = new Bot('DEVELOPMENT', process.env.token, './beta-config', process.env.mongoURI, process.env.dbo);
client.main()
