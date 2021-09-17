const Bot = require('./LPS').Bot;

client = Bot('PRODUCTION', process.env.token, './config');
client.main()
