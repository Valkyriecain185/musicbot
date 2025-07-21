const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Change the bot prefix for this server (for legacy commands)')
        .addStringOption(option =>
            option.setName('new_prefix')
                .setDescription('New prefix (max 5 characters)')
                .setRequired(false)
                .setMaxLength(5))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction, { db }) {
        const newPrefix = interaction.options.getString('new_prefix');

        if (!newPrefix) {
            const guildSettings = await db.getGuildSettings(interaction.guild.id);
            const currentPrefix = guildSettings ? guildSettings.prefix : '!';
            
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🔧 Current Prefix')
                .setDescription(`The current prefix is: **${currentPrefix}**`)
                .addFields({ name: 'Note', value: 'This bot now primarily uses slash commands! The prefix is only for legacy support.' })
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }

        try {
            await db.updateGuildPrefix(interaction.guild.id, newPrefix);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Prefix Changed')
                .setDescription(`Prefix changed to: **${newPrefix}**`)
                .addFields({ name: 'Recommendation', value: 'Consider using slash commands instead! They\'re more reliable and user-friendly.' })
                .setFooter({ text: `Changed by ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Prefix command error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to change prefix!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};