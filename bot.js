const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  REST,
  Routes
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const TOKEN = "MTQ3OTI3MjIyMTEzMzI0MjQ0OQ.GH77oF._w3PvayWey9gbdnqHDMQMCKfhefSnI5NVfs8hY"; // Replace with your bot token
const STAFF_CHANNEL = "1479182191727743218"; // Replace with your staff request channel
const CLAIM_ROLE = "1479177973838909572"; // Optional: staff role that can claim

// Store user stats in memory (can be replaced with a database)
const userStats = {}; // { userId: { total: X, completed: Y, pending: Z } }
const cooldown = new Set();

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("get-custom-account")
    .setDescription("Request a custom account"),
  new SlashCommandBuilder()
    .setName("checkstat")
    .setDescription("Check your request stats"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands("1479272221133242449"), { body: commands });
    console.log("✅ Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
})();

// Bot logic
client.on("interactionCreate", async (interaction) => {

  // Slash Commands
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "get-custom-account") {

      if (cooldown.has(interaction.user.id)) {
        return interaction.reply({
          content: "⏳ You can only request an account once every 60 seconds.",
          ephemeral: true,
        });
      }

      cooldown.add(interaction.user.id);
      setTimeout(() => cooldown.delete(interaction.user.id), 60000);

      const embed = new EmbedBuilder()
        .setTitle("🌌 Project Venus Account Request")
        .setDescription("Select the game you want the account for:")
        .setColor("#8a2be2")
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/3208/3208711.png")
        .setFooter({ text: "Project Venus • Maxed Accounts" });

      const menu = new StringSelectMenuBuilder()
        .setCustomId("game_select")
        .setPlaceholder("Choose a game")
        .addOptions([
          { label: "Strongman Simulator", description: "Popular & Best 🏋️‍♂️", value: "strongman" },
          { label: "Murder Mystery 2", description: "MM2 🔪", value: "mm2" },
          { label: "Steal a Brain Rot", description: "Not Supported ❌", value: "brainrot" },
          { label: "Grow Garden", description: "🌱 Max Growth", value: "growgarden" },
        ]);

      await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });

    }

    if (interaction.commandName === "checkstat") {
      const stats = userStats[interaction.user.id] || { total: 0, completed: 0, pending: 0 };
      const embed = new EmbedBuilder()
        .setTitle("📊 Your Project Venus Stats")
        .setColor("#9b30ff")
        .setDescription(`**Total Requests:** ${stats.total}\n**Completed:** ${stats.completed}\n**Pending:** ${stats.pending}`)
        .setFooter({ text: "Project Venus • Request Stats" });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

  }

  // Dropdown selection
  if (interaction.isStringSelectMenu() && interaction.customId === "game_select") {
    const game = interaction.values[0];

    if (game === "brainrot") {
      return interaction.reply({ content: "❌ Steal a Brain Rot is not supported right now.", ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`custom_yes_${game}`)
        .setLabel("Custom Username & Password (Takes Longer)")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`custom_no_${game}`)
        .setLabel("Random Login")
        .setStyle(ButtonStyle.Success)
    );

    const embed = new EmbedBuilder()
      .setTitle(`Game Selected: ${game}`)
      .setDescription("Do you want a custom username & password, or a random login?")
      .setColor("#9b30ff")
      .setFooter({ text: "Project Venus • Choose Option" });

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // Button clicks
  if (interaction.isButton()) {
    const [action, answer, game, userId] = interaction.customId.split("_");
    const staffChannel = await client.channels.fetch(STAFF_CHANNEL);

    // Claim request
    if (action === "claim") {
      if (CLAIM_ROLE && !interaction.member.roles.cache.has(CLAIM_ROLE)) {
        return interaction.reply({ content: "❌ You don't have permission to claim requests.", ephemeral: true });
      }

      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor("#00ff00")
        .setFooter({ text: `Claimed by ${interaction.user.tag}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`done_${userId}_${game}`)
          .setLabel("Request Done")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({ embeds: [updatedEmbed], components: [row] });
    }

    // Mark as done
    if (action === "done") {
      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor("#0000ff")
        .setFooter({ text: `Completed by ${interaction.user.tag}` });

      await interaction.update({ embeds: [updatedEmbed], components: [] });

      // Update user stats
      if (!userStats[userId]) userStats[userId] = { total: 1, completed: 1, pending: 0 };
      else {
        userStats[userId].completed++;
        userStats[userId].pending = Math.max(0, userStats[userId].pending - 1);
      }
    }

    // Handle custom/random login buttons
    if (action === "custom") {
      if (answer === "no") {
        // Random login request
        staffChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("📩 New Account Request")
              .setColor("#8a2be2")
              .setDescription(`**User:** ${interaction.user.tag}\n**Game:** ${game}\n**Custom Login:** No`)
              .setFooter({ text: "Click ✅ to claim" })
              .setTimestamp(),
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`claim_${interaction.user.id}_${game}`)
                .setLabel("✅ Claim")
                .setStyle(ButtonStyle.Primary)
            ),
          ],
        });

        // Update stats
        if (!userStats[interaction.user.id]) userStats[interaction.user.id] = { total: 1, completed: 0, pending: 1 };
        else {
          userStats[interaction.user.id].total++;
          userStats[interaction.user.id].pending++;
        }

        return interaction.reply({
          content: "✅ Thanks! Your request has been sent. It will take 1 day – 3 weeks depending on the game and options.",
          ephemeral: true,
        });
      }

      if (answer === "yes") {
        const modal = new ModalBuilder()
          .setCustomId(`login_${game}`)
          .setTitle(`Custom Login - ${game}`);

        const username = new TextInputBuilder()
          .setCustomId("username")
          .setLabel("Desired Username")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your username");

        const password = new TextInputBuilder()
          .setCustomId("password")
          .setLabel("Desired Password")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Enter your password");

        modal.addComponents(
          new ActionRowBuilder().addComponents(username),
          new ActionRowBuilder().addComponents(password)
        );

        await interaction.showModal(modal);
      }
    }
  }

  // Modal submission
  if (interaction.isModalSubmit()) {
    const game = interaction.customId.split("_")[1];
    const username = interaction.fields.getTextInputValue("username");
    const password = interaction.fields.getTextInputValue("password");
    const staffChannel = await client.channels.fetch(STAFF_CHANNEL);

    staffChannel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("📩 New Custom Account Request")
          .setColor("#8a2be2")
          .setDescription(`**User:** ${interaction.user.tag}\n**Game:** ${game}\n**Custom Login:** Yes\n**Username:** ${username}\n**Password:** ${password}`)
          .setFooter({ text: "Click ✅ to claim" })
          .setTimestamp(),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_${interaction.user.id}_${game}`)
            .setLabel("✅ Claim")
            .setStyle(ButtonStyle.Primary)
        ),
      ],
    });

    // Update stats
    if (!userStats[interaction.user.id]) userStats[interaction.user.id] = { total: 1, completed: 0, pending: 1 };
    else {
      userStats[interaction.user.id].total++;
      userStats[interaction.user.id].pending++;
    }

    await interaction.reply({
      content: "✅ Thanks! Your request has been sent. It will take 1 day – 3 weeks depending on the game and options.",
      ephemeral: true,
    });
  }

});

client.login(TOKEN);