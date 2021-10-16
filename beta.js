const bot = require('./LPS').Bot;
const config = require('./beta-config')

let client =  new bot('DEVELOPMENT', this.env.token, config, this.env.mongoURI, this.env.dbo);
client.main()
