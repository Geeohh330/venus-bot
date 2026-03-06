// bot.js
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, InteractionType } = require("discord.js");

// Create client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// === SETUP SLASH COMMANDS ===
const commands = [
  new SlashCommandBuilder()
    .setName("get-custom-account")
    .setDescription("Request a custom Roblox account"),
  new SlashCommandBuilder()
    .setName("check-stat")
    .setDescription("Check the status of your request")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("Commands registered!");
  } catch (err) {
    console.error(err);
  }
})();

// === HELPER DATA ===
const requests = {}; // store user requests temporarily

// === EVENT LISTENERS ===
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Interaction handler
client.on("interactionCreate", async interaction => {
  if (interaction.type !== InteractionType.ApplicationCommand && interaction.type !== InteractionType.MessageComponent) return;

  // --- GET CUSTOM ACCOUNT ---
  if (interaction.isChatInputCommand() && interaction.commandName === "get-custom-account") {
    const embed = new EmbedBuilder()
      .setTitle("Project Venus Account Request")
      .setDescription("Select the game you want maxed on the account")
      .setColor("Purple");

    const gameSelect = new StringSelectMenuBuilder()
      .setCustomId("select_game")
      .setPlaceholder("Choose a game...")
      .addOptions(
        { label: "Strongman Simulator", value: "strongman", description: "Popular & Best!" },
        { label: "Murder Mystery 2", value: "murdermystery2", description: "Coming soon!" },
        { label: "Steal a Brain Rot", value: "stealabrain", description: "Not supported yet" },
        { label: "Grow Garden", value: "growgarden", description: "Ready to request" }
      );

    const row = new ActionRowBuilder().addComponents(gameSelect);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // --- SELECT MENU HANDLER ---
  if (interaction.isStringSelectMenu() && interaction.customId === "select_game") {
    const game = interaction.values[0];

    if (game === "stealabrain" || game === "murdermystery2") {
      return interaction.update({ content: "Sorry, this game is not supported yet.", embeds: [], components: [] });
    }

    // Ask about custom username/password
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("custom_yes")
        .setLabel("Custom Username/Password (Takes longer)")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("custom_no")
        .setLabel("No Custom Username/Password")
        .setStyle(ButtonStyle.Secondary)
    );

    requests[interaction.user.id] = { game };
    await interaction.update({ content: `You selected **${game}**. Do you want a custom username/password?`, embeds: [], components: [row] });
  }

  // --- BUTTON HANDLER ---
  if (interaction.isButton()) {
    const request = requests[interaction.user.id];
    if (!request) return;

    if (interaction.customId === "custom_yes") {
      requests[interaction.user.id].custom = true;
      await interaction.update({ content: "Please reply with your desired username and password.", components: [] });
    } else if (interaction.customId === "custom_no") {
      requests[interaction.user.id].custom = false;
      await interaction.update({ content: "Request sent! Thanks. It will take 1 day - 3 weeks depending on the game and options.", components: [] });
    } else if (interaction.customId === "request_done") {
      delete requests[interaction.user.id];
      await interaction.update({ content: "Request marked as done!", components: [] });
    }
  }

  // --- CHECK STAT ---
  if (interaction.isChatInputCommand() && interaction.commandName === "check-stat") {
    const request = requests[interaction.user.id];
    if (!request) return interaction.reply({ content: "No active requests.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("Request Status")
      .setDescription(`Game: **${request.game}**\nCustom: **${request.custom ? "Yes" : "No"}**`)
      .setColor("Purple");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// === LOGIN ===
client.login(process.env.DISCORD_TOKEN);
