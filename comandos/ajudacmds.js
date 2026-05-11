const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajudacmds')
        .setDescription('Mostra todos os comandos disponíveis do BOT'),

    async execute(interaction) {

        // Cargo permitido
     const cargoPermitido = '1415896418765242492';

if (!interaction.member.roles.cache.has(cargoPermitido)) {
    return interaction.reply({
        content: '❌ Você não possui permissão para usar este comando.',
        ephemeral: true
    });
}

        const embed = new EmbedBuilder()
            .setTitle('📚 Central de Comandos')
            .setDescription('🔷 Lista de comandos disponíveis no Brasil Play Life vBlue 🔷.')
            .addFields(
                {
                    name: '🎫 Tickets',
                    value:
                    '`.painel` → Envia o painel de tickets',
                    inline: false
                },
                {
                    name: '⚙️ Moderação',
                    value:
                    '`.expulsar` → Expulsa o usuário mencionado do servidor',
                    inline: false
                },
                {
                    name: '📌 Informações',
                    value:
                    '`.informacoes` → Informações do servidor\n' +
                    '`.conexao` → IP do servidor\n' +
                    '`.comunidade` → Comunidade oficial',
                    inline: false
                }
            )
            .setColor('#2b6cff')
            .setFooter({
                text: 'Brasil Play Life • Sistema de Ajuda'
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });
    }
};