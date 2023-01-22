const { EmbedBuilder } = require('discord.js');
const io = require('socket.io-client');

module.exports = {
  name: "debug",
  description: "Debug for bot admin",
  usage: "command",
  debug: true,
  permissions: {
    channel: ["VIEW_CHANNEL", "SEND_MESSAGES", "EMBED_LINKS"],
    member: [],
  },
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
  SlashCommand: {
    /**
     *
     * @param {require("../structures/LinesPoliceCadBot")} client
     * @param {import("discord.js").Message} message
     * @param {string[]} args
     * @param {*} param3
    */
    run: async (client, interaction, args, { GuildDB }) => {
      if (!client.config.Admins.includes(interaction.member.user.id)) return;

      if (args.length==0) return message.channel.send({ content: 'Debug Error: Provide a debug command' });
      if (!client.exists(args[0].value)) return interaction.send({ content: 'Debug Error: Provide a valid debug command' });

      let debugConsole = args[1].value;

      let command = args[0].value.toLowerCase();

      if (command == 'server' || args[0] == 'guild') {
        if (debugConsole) client.log("Debug: Guild >> ");console.debug(GuildDB);
        return interaction.send({ content: "Debug: guild >> read log output" })

      } else if (command == "interaction") {
        if (debugConsole) {
          client.log("Debug: interaction >> ");
          console.debug(interaction);
        }
        return interaction.send({ content: "Debug: interaction >> read log output" });

      } else if (command == "message") {
        return interaction.send({ content: `Use command with prefix to debug \`message\`` });
        
      } else if (command == "pingserver") {
        const socket = io.connect(client.config.socket);
        socket.emit('botping', {message:'hello there'});
        socket.on('botpong', (data) => {
          if (debugConsole) client.log('Debug: Socket responded')
          socket.disconnect();
          return interaction.send({ content: `Debug: Socket responded` })
        });
      
      } else if (command == "apicheck") {
        // TODO: Make axios call to api and get api health
        return interaction.send({ content: 'Debug Notice: \`apicheck\` is currently unavailable' }); 
      
      } else {
        return interaction.send({ content: 'Debug Error: Provide a valid debug command' });
      
      }
    },
  },
}
