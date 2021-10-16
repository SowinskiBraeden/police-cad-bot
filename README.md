### Lines Police CAD Discord Bot
![lines police cad logo](https://github.com/LinesMerrill/police-cad/lines-police-cad.png)

This is the official Lines Police CAD bot for discord integration. It allows you to use Lines Police CAD website features right in your discord channel!

### Requirements : 
1.  [Node.js](https://nodejs.org/en/)
1.  [MongoDB](https://docs.mongodb.com/manual/administration/install-community/)

### Getting Started with Code  : 
1. [Set Up MongoDB](#setting-up-mongodb) and start mongodb
2. Clone repo from https://github.com/SowinskiBraeden/LPC-Bot.git
3. Run `npm install` to install dependencies.
4. Edit the `index.js` file to have the your correct parameters to run the bot.
The parameters are as follows:
    1. Version
    2. Bot Token
    3. path to config
    4. mongoURI
    5. mongoDBO
1. Run `npm start` to run the `index.js` file and start the bot.
1. The bot is now ready to use.

### Setting up MongoDB
1. Install mongodb via brew [Step by step instructions](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/)
1. Start mongodb via brew [Step by step instructions](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/#run-mongodb-community-edition)

### Accessing the Database
1. Locally this will use the knoldus db (or whatever you specify manually)
1. launch mongo via your command-line: `mongo`
1. Use `show dbs` to see all that are available. You should see `knoldus` in the list.
1. Lets use that db: `use knoldus`.
