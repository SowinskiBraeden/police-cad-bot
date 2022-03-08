const LinesPoliceCadBot = require('./LPS');
const client =  new LinesPoliceCadBot(require('./config/beta-config'));

client.build();

module.exports = client;
