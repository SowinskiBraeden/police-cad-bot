const LinesPoliceCadBot = require('./LPS');
const client =  new LinesPoliceCadBot(require('./config/config'));

client.build();

module.exports = client;
