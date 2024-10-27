require('dotenv').config()

module.exports = {
	Dev: "PRODUCTION",
	Version: "3.2.3",
  Admins: ["362791661274660874"], // Admins of the bot
	DefaultPrefix: "?",
	socket: "https://www.linespolice-cad.com/",
	SupportServer: "https://discord.gg/w2g2FFmHbF", //Support Server Link
	Token: process.env.token || "", //Discord Bot Token
  Scopes: ["identify", "guilds", "applications.commands"], //Discord OAuth2 Scopes
  IconURL: "https://raw.githubusercontent.com/Linesmerrill/police-cad/master/lines-police-cad.png",
  EmbedColor: "#0099ff",
  Permissions: 2205281600,
  Website: "https://linespolice-cad.com",
  api_url: process.env.API_URL || "",
  api_token: process.env.API_TOKEN || "",
  mongoURI: process.env.mongoURI || "mongodb://localhost:27017",
  dbo: process.env.dbo || "knoldus",
  Colors: {
    Red: "#ba0f0f"
  },
  Presence: {
    status: "online", // You can show online, idle, and dnd
    name: "Grand Theft Auto V", // The message shown
    type: "PLAYING", // PLAYING, WATCHING, LISTENING, STREAMING
  },
}