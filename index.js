process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
    console.log("Ping recebido");
    res.send('Bot online!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor web rodando na porta ${PORT}`);
});

require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Collection,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActivityType
} = require('discord.js');

const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

// ===== CONFIG =====
const TICKET_CATEGORY_ID = 
"1440707415166288024";
const TICKET_LOG_CHANNEL_ID = "1417575216296755220";
const STAFF_ROLE_ID = "1415898654518284339"; // <-- cargo que pode fechar
const PREFIX = "!";
// ==================

// carregar comandos
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', () => {
    console.log(`Bot online como ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: "🎫 Atendimento 24/7 • Brasil Play Life vBlue",
            type: ActivityType.Playing
        }],
        status: "online"
    });
});

// ===== INTERAÇÕES =====
client.on('interactionCreate', async interaction => {

    // ===== SELECT MENU (CRIAR TICKET) =====
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_menu') {
            const tipo = interaction.values[0];
            const motivos = {
                suporte: "<:Manutencao:797161188965220394> Suporte",
                denuncia: "<:ateno:690049748778090499> Denúncia",
                duvida: "<:emoji_76:1275944533288554506> Dúvidas"
            };

            const motivoFormatado = motivos[tipo] || tipo;

            const ticketData = {
                userTag: interaction.user.tag,
                motivo: motivoFormatado,
                createdAt: new Date()
            };

            const canal = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.SendMessages
                        ],
                    },
                    {
                        id: STAFF_ROLE_ID,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages
                        ],
                    }
                ],
            });

            canal.ticketData = ticketData;

            const embed = new EmbedBuilder()
                .setTitle("🎫 Ticket Aberto")
                .addFields(
                    { name: "👤 Usuário", value: `${interaction.user}`, inline: true },
                    { name: "📌 Motivo", value: motivoFormatado, inline: true }
                )
                .setColor("#2b6cff");
            
            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('fechar_ticket')
                    .setLabel('🔒 Fechar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await canal.send({
                content: `${interaction.user} <@&${STAFF_ROLE_ID}>`,
                embeds: [embed],
                components: [botoes]
            });

            await interaction.reply({
                content: `✅ Seu ticket foi criado: ${canal}`,
                ephemeral: true
            });
        }
    }

    // ===== BOTÃO FECHAR =====
    if (interaction.isButton()) {
        if (interaction.customId === 'fechar_ticket') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({
                    content: "❌ Você não pode fechar este ticket.",
                    ephemeral: true
                });
            }

            await interaction.reply("🔒 Fechando ticket...");

            const ticket = interaction.channel.ticketData;

            const logEmbed = new EmbedBuilder()
                .setTitle("📁 Ticket Fechado")
                .addFields(
                    { name: "👤 Usuário", value: ticket?.userTag || "Desconhecido", inline: true },
                    { name: "🛡️ Fechado por", value: interaction.user.tag, inline: true },
                    { name: " Categoria", value: ticket?.motivo || "Não informado", inline: false }
                )
                .setColor("#ff0000")
                .setFooter({
                    text: `Aberto em: ${ticket?.createdAt?.toLocaleString() || "?"}`
                });

            const logChannel = interaction.guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);

            if (logChannel) {
                logChannel.send({ embeds: [logEmbed] });
            }

            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 3000);
        }
    }
}); // <--- O fechamento vital que estava faltando/errado

// ===== COMANDO !painel =====
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === "painel") {

        if (!message.member.roles.cache.has(STAFF_ROLE_ID)) {
            return message.reply("❌ Você não tem permissão.");
        }

        const embed = new EmbedBuilder()
    .setTitle(" Central de Atendimento — Brasil Play Life")
    .setDescription(
        "Bem-vindo ao suporte oficial.\n\n" +
        "Selecione abaixo o tipo de atendimento que você precisa.\n\n" +
         "Abra um ticket apenas se for realmente necessário.\n" +
        "📌 Descreva seu problema com clareza para agilizar o atendimento."
    )   
    .addFields(
        { name: " <:Manutencao:797161188965220394> Suporte", value: "Problemas técnicos, bugs ou ajuda geral.", inline: false },
        { name: " <:ateno:690049748778090499> Denúncia", value: "Reporte jogadores ou situações irregulares.", inline: false },
        { name: " <:emoji_76:1275944533288554506> Dúvidas", value: "Perguntas sobre o servidor ou funcionamento.", inline: false }
    )
    .setColor("#2b6cff")
.setImage("https://cdn.discordapp.com/attachments/1378768235247440088/1501365628244590692/file_00000000c78c71f5b0e80a79cd7a8a88.png?ex=69fbcf33&is=69fa7db3&hm=13169a875c2dc2b7ea18e136d2c4f06162f8e2c2e0c308bd615955d55d776a03&")
    .setFooter({ text: "Brasil Play Life • Atendimento" });

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_menu')
                .setPlaceholder('Selecione uma opção')
                .addOptions([
                    {
                        label: 'Suporte',
                        value: 'suporte',
                        description: 'Preciso de ajuda', 
                        emoji:  {id: "797161188965220394"}
                    
                    },
                    {
                        label: 'Denúncia',
                        value: 'denuncia',
                        description: 'Reportar jogador',
                        emoji: {id: "690049748778090499"}
                        
                    },
                    {
                        label: 'Dúvidas',
                        value: 'duvida',
                        description: 'Tirar dúvidas',
                        emoji: {id:
"1275944533288554506"}
                        
                    }
                ])
        );

        await message.channel.send({
            embeds: [embed],
            components: [menu]
        });
    }
});

client.login(process.env.TOKEN_BOT);
