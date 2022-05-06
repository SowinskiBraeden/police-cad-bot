const { MessageEmbed } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "debug",
  description: "Debug for bot admin",
  usage: "command",
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
  aliases: [],
  /**
   *
   * @param {require("../structures/LinesPoliceCadBot")} client
   * @param {import("discord.js").Message} message
   * @param {string[]} args
   * @param {*} param3
  */
  run: async (client, message, args, { GuildDB }) => {
    if (!client.config.Admins.includes(message.author.id)) return;

    if (args.length==0) return message.channel.send('Debug Error: Provide a debug command');
    if (!client.client.exists(args[0])) return message.channel.send('Debug Error: Provide a valid debug command');

    let debugConsole = false
    if (client.client.exists(args[1])&&args[1]=='true') debugConsole = true

    let command = args[0].toLowerCase();

    if (command == 'server' || command == 'guild') {
      if (debugConsole) {
        client.log("Debug: Guild >> ");
        console.debug(GuildDB);
      }
      return message.channel.send("Debug: guild >> read log output")

    } else if (command == "interaction") {
      return message.channel.send(`Use slash command to debug \`interaction\``);
    
    } else if (command == "message") {
      if (debugConsole) {
        client.log("Debug: message >> ");
        console.debug(message);
      }
      return message.channel.send("Debug: message >> read log output");
    
    } else if (command == "pingserver") {
      const socket = io.connect(client.config.socket);
      socket.emit('botping', {message:'hello there'});
      socket.on('botpong', (data) => {
        if (debugConsole) client.log('Debug: Socket responded')
        return message.channel.send(`Debug: Socket responded`)
        socket.disconnect();
      });
    
    } else if (command == "apicheck") {
      // TODO: Make axios call to api and get api health
      return message.channel.send('Debug Notice: \`apicheck\` is currently unavailable'); 
    
    } else {
      return message.channel.send('Debug Error: Provide a valid debug command');
    
    }
  },
  SlashCommand: {
    options: [
      {
        name: "command",
        description: "The debug command to execute",
        value: "command",
        type: 3,
        required: true,
      },
      {
        name: "consoleoutput",
        description: "Output debug messages to console (deault=false)",
        value: "consoleoutput",
        type: 5,
        required: true,
      },
    ],
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (!client.config.Admins.includes(interaction.member.user.id)) return;

      if (args.length==0) return message.channel.send('Debug Error: Provide a debug command');
      if (!client.client.exists(args[0].value)) return interaction.send('Debug Error: Provide a valid debug command');

      let debugConsole = args[1].value;

      let command = args[0].value.toLowerCase();

      if (command == 'server' || args[0] == 'guild') {
        if (debugConsole) client.log("Debug: Guild >> ");console.debug(GuildDB);
        return interaction.send("Debug: guild >> read log output")

      } else if (command == "interaction") {
        if (debugConsole) {
          client.log("Debug: interaction >> ");
          console.debug(interaction);
        }
        return interaction.send("Debug: interaction >> read log output");

      } else if (command == "message") {
        return interaction.send(`Use command with prefix to debug \`message\``);
        
      } else if (command == "pingserver") {
        const socket = io.connect(client.config.socket);
        socket.emit('botping', {message:'hello there'});
        socket.on('botpong', (data) => {
          if (debugConsole) client.log('Debug: Socket responded')
          return interaction.send(`Debug: Socket responded`)
          socket.disconnect();
        });
      
      } else if (command == "apicheck") {
        // TODO: Make axios call to api and get api health
        return interaction.send('Debug Notice: \`apicheck\` is currently unavailable'); 
      
      } else {
        return interaction.send('Debug Error: Provide a valid debug command');
      
      }
    },
  },
}
