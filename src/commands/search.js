const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ytsr = require('ytsr');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for songs on YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Search query')
                .setRequired(true)),
    
    async execute(interaction, { distube }) {
        const query = interaction.options.getString('query');

        try {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('🔍 Searching...')
                .setDescription(`Searching for: **${query}**`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });

            const searchResults = await ytsr(query, { limit: 5 });
            const videos = searchResults.items.filter(item => item.type === 'video');

            if (!videos.length) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Results')
                    .setDescription('No videos found for your search!')
                    .setTimestamp();
                
                return await interaction.editReply({ embeds: [embed] });
            }

            let description = '';
            videos.forEach((video, index) => {
                description += `${index + 1}. **[${video.title}](${video.url})**\n`;
                description += `Duration: ${video.duration} | Views: ${video.views}\n`;
                description += `By: ${video.author.name}\n\n`;
            });

            const resultEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🔍 Search Results for: ${query}`)
                .setDescription(description)
                .setFooter({ text: 'Use /play <URL> to play a song' })
                .setTimestamp();

            await interaction.editReply({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('Search command error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to search for songs!')
                .setTimestamp();
            
            if (interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
};