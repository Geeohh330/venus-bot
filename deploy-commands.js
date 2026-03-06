const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
new SlashCommandBuilder()
.setName("get-custom-account")
.setDescription("Request a custom account")
];

const rest = new REST({ version: "10" }).setToken("MTQ3OTI3MjIyMTEzMzI0MjQ0OQ.GH77oF._w3PvayWey9gbdnqHDMQMCKfhefSnI5NVfs8hY");

(async () => {
await rest.put(
Routes.applicationCommands("1479272221133242449"),
{ body: commands }
);
})();