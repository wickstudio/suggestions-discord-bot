const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('./config.json');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions]
});

const suggestionChannelId = config.suggestionChannelId;
const TOKEN = config.TOKEN;
const approverRoleId = config.approverRoleId;
const userVotes = {};

client.once('ready', () => {
    console.log('Bot is online!');
    console.log('Code by Wick Studio');
    console.log('discord.gg/wicks');
});

client.on('messageCreate', message => {
    if (message.channel.id === suggestionChannelId) {
        const messageContent = message.content;

        if (!messageContent.trim()) {
            console.log('تم ارسال اقتراح جديد.');
            return;
        }

        const suggestionEmbed = new EmbedBuilder()
            .setColor(0x00B2FF)
            .setTitle('📝 اقتراح جديد')
            .setDescription(`**الاقتراح :**\n\`\`\`${messageContent}\`\`\``)
            .setTimestamp()
            .setFooter({ text: `تم الارسال بواسطة : ${message.author.tag}` })
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: 'الحالة', value: '⏳ قيد الانتظار', inline: true },
                { name: 'الدعم', value: '👍 0 | 👎 0', inline: true }
            );
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_${message.author.id}`)
                    .setLabel('قبول')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reject_${message.author.id}`)
                    .setLabel('رفض')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('upvote')
                    .setLabel('👍')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('downvote')
                    .setLabel('👎')
                    .setStyle(ButtonStyle.Primary)
            );

        message.channel.send({ embeds: [suggestionEmbed], components: [row] })
            .then(() => message.delete())
            .catch(console.error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const messageId = interaction.message.id;
    const userId = interaction.user.id;

    if (interaction.customId.startsWith('accept') || interaction.customId.startsWith('reject')) {
        const roleId = approverRoleId;
        if (!interaction.member.roles.cache.has(roleId)) {
            return interaction.reply({ content: 'ليس لديك صلاحية لاستخدام هذا الزر.', ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId(`response-modal-${interaction.customId}`)
            .setTitle('Response');

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason')
            .setStyle(TextInputStyle.Paragraph);

        const actionRow = new ActionRowBuilder().addComponents(reasonInput);

        modal.addComponents(actionRow);

        await interaction.showModal(modal);
    } else if (interaction.customId === 'upvote' || interaction.customId === 'downvote') {
        if (!userVotes[messageId]) userVotes[messageId] = new Set();
        if (userVotes[messageId].has(userId)) {
            return interaction.reply({ content: 'لقد قمت بالتصويت على هذا الاقتراح بالفعل.', ephemeral: true });
        }
        userVotes[messageId].add(userId);

        const originalEmbed = interaction.message.embeds[0];
        const fields = originalEmbed.fields;
        let upvotes = parseInt(fields[1].value.split('|')[0].trim().split(' ')[1]);
        let downvotes = parseInt(fields[1].value.split('|')[1].trim().split(' ')[1]);

        if (interaction.customId === 'upvote') upvotes++;
        if (interaction.customId === 'downvote') downvotes++;


        const updatedEmbed = new EmbedBuilder(originalEmbed)
            .spliceFields(1, 1, { name: 'الدعم', value: `👍 ${upvotes} | 👎 ${downvotes}`, inline: true });

        await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isModalSubmit()) {
        const reason = interaction.fields.getTextInputValue('reason');
        const originalEmbed = interaction.message.embeds[0];
        const decision = interaction.customId.includes('accept') ? 'تم القبول' : 'تم الرفض';

        const updatedButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('upvote')
                    .setLabel('👍')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('downvote')
                    .setLabel('👎')
                    .setStyle(ButtonStyle.Primary)
            );

        const updatedEmbed = new EmbedBuilder(originalEmbed)
            .spliceFields(0, 1, { name: decision, value: reason, inline: true })
            .setColor(decision === 'Accepted' ? 0x28A745 : 0xDC3545);
        await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedButtons] });
        await interaction.reply({ content: `The suggestion has been ${decision.toLowerCase()}.`, ephemeral: true });
        const user = await interaction.guild.members.fetch(interaction.customId.split('_')[1]);
        if (user) {
            user.send({ content: `تم الرد على اقتراحك ب ${decision}` })
        }
    }
});


client.login(TOKEN);
