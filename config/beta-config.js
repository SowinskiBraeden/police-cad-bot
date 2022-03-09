module.exports = {
	Dev: "DEVELOPMENT",
	Version: "2.0.0 Beta",
  Admins: ["362791661274660874"], // Admins of the bot
	defaultPrefix: "?",
	socket: "https://police-cad-dev.herokuapp.com/",
	SupportServer: "https://discord.gg/w2g2FFmHbF", //Support Server Link
	Token: process.env.TOKEN || "", //Discord Bot Token
  Scopes: ["identify", "guilds", "applications.commands"], //Discord OAuth2 Scopes
  IconURL: "https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-server.png",
  EmbedColor: "#0099ff",
  Permissions: 2205281600,
  Website: "https://linespolice-cad.com",
  api_url: process.env.API_URL || "",
  api_token: process.env.API_TOKEN || "",
  mongoURI: process.env.mongoURI || "mongodb://localhost:27017",
  dbo: process.env.dbo || "knoldus",

  Presence: {
    status: "online", // You can show online, idle, and dnd
    name: "GTA V", // The message shown
    type: "Playing", // PLAYING, WATCHING, LISTENING, STREAMING
  },
}
