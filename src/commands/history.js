const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Show the play history for this server')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of songs to show (1-50)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(50)),
    
    async execute(interaction, { db }) {
        const limit = interaction.options.getInteger('limit') || 10;

        try {
            const history = await db.getPlayHistory(interaction.guild.id, limit);
            
            if (!history.length) {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('📜 No History')
                    .setDescription('No play history found for this server!')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed] });
            }

            let description = '';
            for (let i = 0; i < history.length; i++) {
                const entry = history[i];
                const user = await interaction.client.users.fetch(entry.played_by).catch(() => null);
                
                description += `${i + 1}. **[${entry.title}](${entry.url})**\n`;
                description += `Played by: ${user ? user.tag : 'Unknown'} | `;
                description += `<t:${Math.floor(new Date(entry.played_at).getTime() / 1000)}:R>\n\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📜 Play History for ${interaction.guild.name}`)
                .setDescription(description)
                .setFooter({ text: `Showing last ${history.length} songs` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('History command error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to fetch play history!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
