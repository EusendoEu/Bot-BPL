const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ranking")
        .setDescription("Mostra o ranking de horas da staff"),

    async execute(interaction) {

        const rankingHoras = global.rankingHoras;

        if (!rankingHoras || rankingHoras.size === 0) {
            return interaction.reply({
                content: "❌ Ninguém possui horas registradas.",
                ephemeral: true
            });
        }

        const ranking = [...rankingHoras.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        let texto = "";

        for (let i = 0; i < ranking.length; i++) {

            const [userId, tempo] = ranking[i];

            const membro = await interaction.guild.members
                .fetch(userId)
                .catch(() => null);

            const horas = Math.floor(tempo / 3600000);
            const minutos = Math.floor((tempo % 3600000) / 60000);

            texto +=
                `🏅 **${i + 1}°** • ` +
                `${membro ? membro.user.tag : "Usuário"}\n` +
                `⏰ ${horas}h ${minutos}m\n\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle("🏆 Ranking de Horas")
            .setDescription(texto)
            .setColor("Gold")
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};