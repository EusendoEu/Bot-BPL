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
    ActivityType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
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
const PREFIX = ".";

// ===== BATE PONTO =====
const PONTO_PAINEL_CHANNEL_ID = "1416591827678658580";
const PONTO_LOG_CHANNEL_ID = "1426962374903992491";
const PONTO_CATEGORY_ID = "1503511546368757923";
const STAFF_PONTO_ROLE_ID = "1415896418765242492";

const pontos = new Map();
const intervalosPonto = new Map();

// ==================

// carregar comandos
const commandFiles = fs.readdirSync('./comandos').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./comandos/${file}`);
    client.commands.set(command.data.name, command);
}
client.once('ready', () => {
    console.log(`Bot online como ${client.user.tag}`);

    client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "🌐 Brasil Play Life — Suporte & RolePlay",
        type: ActivityType.Custom
      }
    ]
  });
});
    
// ===== INTERAÇÕES =====
client.on('interactionCreate', async interaction => {


    // ===== MODAL FECHAR PONTO =====
if (interaction.isModalSubmit()) {

    if (interaction.customId.startsWith("motivo_fechamento_")) {

        const userId = interaction.customId.replace("motivo_fechamento_", "");

        const membro = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!membro) {
            return interaction.reply({
                content: "❌ Usuário não encontrado.",
                ephemeral: true
            });
        }

        const data = pontos.get(membro.user.id);

        if (!data) {
            return interaction.reply({
                content: "❌ Ponto não encontrado.",
                ephemeral: true
            });
        }

        const motivo = interaction.fields.getTextInputValue("motivo");

        await fecharPonto(interaction, membro, data, motivo);
    }
}



    // ===== SLASH COMMANDS =====
    if (interaction.isChatInputCommand()) {

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);

            await interaction.reply({
                content: '❌ Erro ao executar comando.',
                ephemeral: true
            });
        }

        return;
    }

    // ===== SELECT MENU (CRIAR TICKET) =====
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_menu') {
            const tipo = interaction.values[0];
            const motivos = {
    suporte: "<:Manutencao:797161188965220394> Suporte",
    denuncia: "<:ateno:690049748778090499> Denúncia",
    duvida: "<:emoji_76:1275944533288554506> Dúvidas",
    compras: "<:emoji_24:1076816673220341842> Compras"
};

            const motivoFormatado = motivos[tipo] || tipo;

            const ticketData = {
                userTag: interaction.user.tag,
                motivo: motivoFormatado,
                createdAt: new Date()
            };

            let categoriaID = TICKET_CATEGORY_ID;
let cargosPermitidos = [STAFF_ROLE_ID];

if (tipo === 'compras') {
    categoriaID = "1501898943095902330";

    cargosPermitidos = [
        STAFF_ROLE_ID,
        "1415896413086158969",
        "975965906733785128",
        "1425157098085552260",
        "1500929147952959641"
    ];
}

           const ticketsAbertos = interaction.guild.channels.cache.filter(
    c =>
        c.name.startsWith(`ticket-${interaction.user.username}`) &&
        c.parentId === categoriaID
);

if (ticketsAbertos.size >= 2) {
    return interaction.reply({
        content: "❌ Você já possui 2 tickets abertos.",
        ephemeral: true
    });
}

            const canal = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: categoriaID,
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
    ...cargosPermitidos.map(cargo => ({
        id: cargo,
        allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages
        ],
    })),
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
                content: `${interaction.user} ${cargosPermitidos.map(id => `<@&${id}>`).join(' ')}`,
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

     // ===== INICIAR PONTO =====
if (interaction.customId === "iniciar_ponto") {

    const canalExistente = interaction.guild.channels.cache.find(
        c => c.name === `ponto-${interaction.user.username.toLowerCase()}`
    );

    if (canalExistente) {
        return interaction.reply({
            content: "❌ Você já possui um ponto aberto.",
            ephemeral: true
        });
    }

    const canal = await interaction.guild.channels.create({
        name: `ponto-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: PONTO_CATEGORY_ID,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages
                ]
            }
        ]
    });

    const inicio = Date.now();

    pontos.set(interaction.user.id, {
    dono: interaction.user.id,
    inicio,
    pausado: false,
    tempoPausado: 0,
    pausaInicio: null
});

    const embed = new EmbedBuilder()
        .setTitle("📋 BATE PONTO")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
       .addFields(
{
    name: "👤 Usuário",
    value: `${interaction.user}`,
    inline: false
},
{
    name: "📌 Status",
    value: "🟢 Aberto",
    inline: false
},
{
    name: "⏳ Horas em atividade",
    value: "00:00",
    inline: false
},
{
    name: "⏰ Iniciado em",
    value: `<t:${Math.floor(inicio / 1000)}:F>`,
    inline: false
}
)
        .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("pausar_ponto")
            .setLabel("Pausar")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("voltar_ponto")
            .setLabel("Voltar")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId("fechar_ponto")
            .setLabel("Fechar")
            .setStyle(ButtonStyle.Danger)
    );

    const mensagemPonto = await canal.send({
        content: `${interaction.user}`,
        embeds: [embed],
        components: [row]
    });

    interaction.reply({
        content: `✅ Seu ponto foi iniciado em ${canal}`,
        ephemeral: true
    });

    // Atualizador automático do tempo
const intervalo = setInterval(async () => {

    const pontoData = pontos.get(interaction.user.id);

    if (!pontoData) {
        clearInterval(intervalo);
        intervalosPonto.delete(interaction.user.id);
        return;
    }

    let tempoAtual;

    // Se estiver pausado, congela o tempo
    if (pontoData.pausado) {

        tempoAtual =
            pontoData.pausaInicio -
            pontoData.inicio -
            pontoData.tempoPausado;

    } else {

        tempoAtual =
            Date.now() -
            pontoData.inicio -
            pontoData.tempoPausado;
    }

    const horas = Math.floor(tempoAtual / 3600000);
    const minutos = Math.floor((tempoAtual % 3600000) / 60000);

    const tempoFormatado =
        `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;

    const embedAtualizado = EmbedBuilder.from(mensagemPonto.embeds[0]);

    embedAtualizado.spliceFields(2, 1, {
        name: "⏳ Horas em atividade",
        value: tempoFormatado,
        inline: false
    });

    await mensagemPonto.edit({
        embeds: [embedAtualizado]
    }).catch(() => {});

}, 60000);

intervalosPonto.set(interaction.user.id, intervalo);

}


// ===== PAUSAR =====
if (interaction.customId === "pausar_ponto") {

    const usuarioCanal = interaction.channel.name
    .replace("ponto-", "");

const membro = interaction.guild.members.cache.find(
    m => m.user.username.toLowerCase() === usuarioCanal.toLowerCase()
);

if (!membro) return;

const data = pontos.get(membro.user.id);

    if (!data) return;
   
    if (interaction.user.id !== data.dono) {
    return interaction.reply({
        content: "❌ Esse ponto não é seu.",
        ephemeral: true
    });
}

    data.pausado = true;
    data.pausaInicio = Date.now();

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    embed.spliceFields(1, 1, {
        name: "📌 Status",
        value: "🟡 Pausado",
        inline: false
    });

    embed.setColor("Yellow");

    await interaction.update({
        embeds: [embed]
    });
}

// ===== VOLTAR =====
if (interaction.customId === "voltar_ponto") {

    const usuarioCanal = interaction.channel.name
    .replace("ponto-", "");

const membro = interaction.guild.members.cache.find(
    m => m.user.username.toLowerCase() === usuarioCanal.toLowerCase()
);

if (!membro) return;

const data = pontos.get(membro.user.id);

    if (!data) return;

    if (interaction.user.id !== data.dono) {
    return interaction.reply({
        content: "❌ Esse ponto não é seu.",
        ephemeral: true
    });
}

    if (data.pausado && data.pausaInicio) {
        data.tempoPausado += Date.now() - data.pausaInicio;
    }

    data.pausado = false;
    data.pausaInicio = null;

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    embed.spliceFields(1, 1, {
        name: "📌 Status",
        value: "🟢 Aberto",
        inline: false
    });

    embed.setColor("Green");

    await interaction.update({
        embeds: [embed]
    });
}

// ===== FECHAR =====
if (interaction.customId === "fechar_ponto") {

    const usuarioCanal = interaction.channel.name
        .replace("ponto-", "");

    const membro = interaction.guild.members.cache.find(
        m => m.user.username.toLowerCase() === usuarioCanal.toLowerCase()
    );

    if (!membro) return;

    const data = pontos.get(membro.user.id);

    if (!data) {
        return interaction.reply({
            content: "❌ Nenhum ponto encontrado.",
            ephemeral: true
        });
    }

    const temCargo = interaction.member.roles.cache.has(STAFF_PONTO_ROLE_ID);

    // Sem permissão
    if (interaction.user.id !== data.dono && !temCargo) {
        return interaction.reply({
            content: "❌ Você não tem permissão para fechar este ponto.",
            ephemeral: true
        });
    }

    // Se for o próprio usuário fechando
    if (interaction.user.id === data.dono) {
        return fecharPonto(interaction, membro, data, null);
    }

    // STAFF fechando ponto de outro
    const modal = new ModalBuilder()
        .setCustomId(`motivo_fechamento_${membro.user.id}`)
        .setTitle("Fechar ponto");

    const motivoInput = new TextInputBuilder()
        .setCustomId("motivo")
        .setLabel("Qual motivo do fechamento?")
        .setPlaceholder("Ex: Farmando hora")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(motivoInput);

    modal.addComponents(row);

    await interaction.showModal(modal);
}

const temCargo = interaction.member.roles.cache.has(STAFF_PONTO_ROLE_ID);

if (interaction.user.id !== data.dono && !temCargo) {
    return interaction.reply({
        content: "❌ Você não tem permissão para fechar este ponto.",
        ephemeral: true
    });
}

        async function fecharPonto(interaction, membro, data, motivo = null) {

    let tempoFinal = Date.now() - data.inicio - data.tempoPausado;

    if (data.pausado && data.pausaInicio) {
        tempoFinal -= (Date.now() - data.pausaInicio);
    }

    const horas = Math.floor(tempoFinal / 3600000);
    const minutos = Math.floor((tempoFinal % 3600000) / 60000);

    const logEmbed = new EmbedBuilder()
        .setTitle("📋 LOG DE PONTO")
        .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            {
                name: "👤 Usuário",
                value: `${membro.user.tag}`,
                inline: false
            },
            {
                name: "⏰ Tempo Total",
                value: `${horas}h ${minutos}m`,
                inline: false
            },
            {
                name: "🔒 Fechado por",
                value: `${interaction.user.tag}`,
                inline: false
            }
        )
        .setColor("Red")
        .setTimestamp();

    // Só adiciona motivo se alguém da staff fechou
    if (motivo) {
        logEmbed.addFields({
            name: "📌 Motivo",
            value: motivo,
            inline: false
        });
    }

    const logs = interaction.guild.channels.cache.get(PONTO_LOG_CHANNEL_ID);

    if (logs) {
        logs.send({
            embeds: [logEmbed]
        });
    }

    pontos.delete(membro.user.id);

    await interaction.reply({
        content: "🔴 Ponto encerrado.",
        ephemeral: true
    });

    setTimeout(() => {
        interaction.channel.delete().catch(() => {});
    }, 3000);
}


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
    text: `Aberto em: ${ticket?.createdAt?.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
    }) || "?"}`
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
        "• Selecione abaixo o tipo de atendimento que você precisa.\n\n" +
         "• Abra um ticket apenas se for realmente necessário.\n" +
        "📌 Descreva seu problema com clareza para agilizar o atendimento."
    )   
    .addFields(
        { name: " <:Manutencao:797161188965220394> Suporte", value: "Problemas técnicos, bugs ou ajuda geral.", inline: false },
        { name: " <:ateno:690049748778090499> Denúncia", value: "Reporte jogadores ou situações irregulares.", inline: false },
        { name: " <:emoji_76:1275944533288554506> Dúvidas", value: "Perguntas sobre o servidor ou funcionamento.", inline: false },
       { name: " <:emoji_24:1076816673220341842> Compras", value: "Atendimento relacionado a compras.", inline: false }
    )
    .setColor("#2b6cff")
.setImage("https://cdn.discordapp.com/attachments/1415896639540826173/1501719310882832546/file_00000000c78c71f5b0e80a79cd7a8a88.png?ex=69fd1898&is=69fbc718&hm=e110a0f1404eee237b42a605975c1807fa7161feb687a4f568214a552c1f8fd0&")
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
                        
                    },
                    {
                       
                       label: 'Compras',
                       value: 'compras',
                       description: 'Abrir ticket de compras',
                       emoji: { id: "1076816673220341842" }
}

                ])
        );

        await message.channel.send({
            embeds: [embed],
            components: [menu]
        });
    }

// ==== COMANDO !expulsar ==== //
if (command === "expulsar") {

    // ID do usuário permitido
    const cargoPermitido = '1415896418765242492';

if (!message.member.roles.cache.has(cargoPermitido)) {
    return message.reply("❌ Você não possui permissão para usar o comando.");
}

    // Verifica menção
    const membro = message.mentions.members.first();

    if (!membro) {
        return message.reply("❌ Mencione um usuário para expulsar.");
    }

    // Motivo
    const motivo = args.slice(1).join(" ") || "Nenhum motivo informado";

    // Verifica permissão do bot
    if (!membro.kickable) {
        return message.reply("❌ Não consigo expulsar este usuário.");
    }

    // Expulsar
    await membro.kick(motivo);

    const embed = new EmbedBuilder()
        .setTitle("👢 Usuário Expulso")
        .addFields(
            {
                name: "👤 Usuário",
                value: `${membro.user.tag}`,
                inline: true
            },
            {
                name: "🛡️ Expulso por",
                value: `${message.author.tag}`,
                inline: true
            },
            {
                name: "📌 Motivo",
                value: motivo,
                inline: false
            }
        )
        .setColor("#ff0000")
        .setTimestamp();

    message.channel.send({
        embeds: [embed]
    });
}



// ==== COMANDO !imformações ====//
if (command === "informacoes") {

    const embed = new EmbedBuilder()
        .setTitle("<:emoji_73:1140329738368450671> BEM-VINDO AO BRASIL PLAY LIFE vBlue (BPL) <a:aviso_bpl:798815607537401856>")
        .setColor("#2b6cff")
        .setDescription(
`• O Brasil Play Life Roleplay (BPL) é um servidor SA-MP focado em Extreme Roleplay, desenvolvido para jogadores que realmente querem viver uma experiência intensa, realista e imersiva dentro do universo do RP brasileiro.

• Aqui não existe espaço para zoação, atitudes Anti-RP ou falta de comprometimento — cada ação tem consequência, cada escolha molda seu futuro e cada personagem constrói sua própria história.

• No BPL, o realismo vem sempre em primeiro lugar. Nosso sistema é estruturado para proporcionar uma experiência séria e organizada, onde disciplina e interpretação são fundamentais.

• Trabalhamos com uma economia equilibrada e progressiva, garantindo que cada conquista seja fruto de esforço e dedicação.

• Contamos com facções e organizações baseadas na realidade, profissões estruturadas, sistema policial com procedimentos reais e regras bem definidas.

• Nossa staff é ativa, imparcial e experiente, sempre presente para manter o equilíbrio da comunidade.`
        )
        .addFields(
            {
                name: "🛑 O Brasil Play Life não é para qualquer um",
                value:
`<:1054538048710385716:1417286986389000284> É para quem busca imersão total
<:1054538048710385716:1417286986389000284> É para quem respeita as regras
<:1054538048710385716:1417286986389000284> É para quem entende que RP é compromisso`
            },
            {
                name: "📋 Antes de iniciar sua jornada",
                value:
`<:5483discordticemoji:1420915655317917827> Ler e compreender as regras
<:5483discordticemoji:1420915655317917827> Aceitar os termos do servidor
<:5483discordticemoji:1420915655317917827> Utilizar microfone
<:5483discordticemoji:1420915655317917827> Agir sempre com bom senso`
            }
        )
        .setFooter({
            text: " 🔷 Brasil Play Life vBlue "
        });

    message.channel.send({ embeds: [embed] });
}

//==== COMANDO !conexao ====//
if (command === "conexao") {

    const embed = new EmbedBuilder()
        .setTitle("<:bplblue:1438273471418208337> Brasil Play Life Roleplay - vBlue <:bplblue:1438273471418208337>")
        .setColor("#2b6cff")
        .setDescription(
`<:1054538048710385716:1417286986389000284> O servidor se encontra **ONLINE!**

**IP:** \`server.brasilplaylife.com.br:7779\`
**IP Numérico:** \`151.242.227.124:7779\``
        )
        .setFooter({
            text: "🔷 Brasil Play Life vBlue",
        });

    message.channel.send({ embeds: [embed] });
}

//==== COMANDO !comunidade ====//
if (command === "comunidade") {

    const embed = new EmbedBuilder()
        .setTitle("🌐 Comunidade Brasil Play Life")
        .setColor("#2b6cff")
        .setDescription(
`Olá, **Brasil Play Life**

Temos o prazer de apresentar a **Comunidade Brasil Play Life**, uma rede de servidores dedicada a proporcionar a melhor experiência de jogo para você.

🚀 Atualmente contamos com servidores ativos:`
        )
        .addFields(
            {
                name: "🔴 Brasil Play Life - vRED",
                value:
`🌐 [Entrar no Discord](https://discord.gg/Smy3D478qv)
📡 IP: \`server.brasilplaylife.com.br:7778\``,
                inline: false
            },
            {
                name: "🟢 Brasil Play Life - vGREEN",
                value:
`🌐 [Entrar no Discord](https://discord.gg/UYb6Rc2A)
📡 IP: \`server.brasilplaylife.com.br:7779\``,
                inline: false
            }
        )
        .setFooter({
            text: "Brasil Play Life • Comunidade Oficial"
        });

    message.channel.send({ embeds: [embed] });
}


// ==== COMANDO .painelponto ==== //
if (command === "painelponto") {

    
const embed = new EmbedBuilder()
    .setColor("#2b6cff")

    .setAuthor({
        name: "Brasil Play Life vBlue",
        iconURL: client.user.displayAvatarURL()
    })

    .setTitle("📋 Central de Bate Ponto")

    .setDescription(
`> Sistema oficial de controle de expediente da staff.

━━━━━━━━━━━━━━━━━━
🟢 **Iniciar expediente**
🟡 **Pausar expediente**
🔴 **Finalizar expediente**
━━━━━━━━━━━━━━━━━━

📌 Utilize este painel para registrar seu horário de trabalho na staff.

⏰ **Tempo mínimo obrigatório:** \`2 horas\`
🚨 **Quando estiver com ponto aberto esteja em call**
🔒 **Sistema privado e individual**
`
    )

    .addFields(
        {
            name: "📢 Informações",
            value:
`• Não abra mais de um ponto.
• Utilize pausas apenas quando necessário.
• Ao finalizar, seu horário será registrado automaticamente.`,
            inline: false
        }
    )

    .setImage("https://cdn.discordapp.com/attachments/1416591770111971421/1503528600270278868/b8e1afe848fd1b4c0e4b6c5b974818870112641d7121a2342aedb22ec9afcddd.png?ex=6a03ada0&is=6a025c20&hm=6d829620cbd3a022d31593b2b9efbaff7be876de05251306d3b9c6216d0e7cde&")

    .setFooter({
        text: "Brasil Play Life • Staff System"
    })

    .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("iniciar_ponto")
            .setLabel("Iniciar Ponto")
            .setEmoji("<:admin:1320741093905793074>")
            .setStyle(ButtonStyle.Success)
    );

    const canal = client.channels.cache.get(PONTO_PAINEL_CHANNEL_ID);

    canal.send({
        embeds: [embed],
        components: [row]
    });
}


});


client.login(process.env.TOKEN_BOT);
