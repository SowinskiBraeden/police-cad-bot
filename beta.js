const bot = require('./LPS').Bot;
const config = require('./beta-config')

let client =  new bot('DEVELOPMENT', process.env.token, config, process.env.mongoURI, process.env.dbo);
client.main()
