module.exports = async (client) => {
  (client.Ready = true),
    client.user.setPresence({
    status: client.config.Presence.status, // You can show online, idle, and dnd
    activity: {
      name: client.config.Presence.name,
      type: client.config.Presence.type,
    },
  });
  client.log("Successfully Logged in as " + client.user.tag); // You can change the text if you want, but DO NOT REMOVE "client.user.tag"
  client.RegisterSlashCommands();
};