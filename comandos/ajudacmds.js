const {
    SlashCommandBuilder,
    EmbedBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ajudacmds')
        .setDescription('Mostra todos os comandos do bot'),

    async execute(interaction) {

        // Usuário permitido
        const usuarioPermitido = '1260366223800012931';

        // Verificação
        if (interaction.user.id !== usuarioPermitido) {
            return interaction.reply({
                content: '❌ Você não possui permissão para usar este comando.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📚 Central de Comandos')
            .setDescription('Lista de comandos disponíveis do bot.')
            .addFields(
                {
                    name: '🎫 Tickets',
                    value:
                    '`!painel` → Envia o painel de tickets',
                    inline: false
                },
                {
                    name: '📌 Informações',
                    value:
                    '`!informacoes` → Informações do servidor\n' +
                    '`!conexao` → IP do servidor\n' +
                    '`!comunidade` → Comunidade oficial',
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