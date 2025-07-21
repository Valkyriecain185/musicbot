const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view')
                .setRequired(false)
                .setMinValue(1)),
    
    async execute(interaction, { distube }) {
        const queue = distube.getQueue(interaction.guild.id);
        
        if (!queue || !queue.songs.length) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Empty Queue')
                .setDescription('There are no songs in the queue!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }

        const page = interaction.options.getInteger('page') || 1;
        const songsPerPage = 10;
        const start = (page - 1) * songsPerPage;
        const end = start + songsPerPage;
        const totalPages = Math.ceil(queue.songs.length / songsPerPage);

        if (page > totalPages || page < 1) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Invalid Page')
                .setDescription(`Please provide a page number between 1 and ${totalPages}!`)
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const queueSongs = queue.songs.slice(start, end);
        
        let description = '';
        
        // Current song
        if (page === 1) {
            description += `**🎵 Now Playing:**\n[${queue.songs[0].name}](${queue.songs[0].url}) - ${queue.songs[0].formattedDuration}\n*Requested by ${queue.songs[0].user}*\n\n`;
        }
        
        // Queue songs
        if (queue.songs.length > 1) {
            description += '**📜 Up Next:**\n';
            const startIndex = page === 1 ? 1 : start;
            const displaySongs = page === 1 ? queue.songs.slice(1, end) : queueSongs;
            
            displaySongs.forEach((song, index) => {
                const position = startIndex + index;
                description += `${position}. [${song.name}](${song.url}) - ${song.formattedDuration}\n*Requested by ${song.user}*\n\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`🎶 Queue for ${interaction.guild.name}`)
            .setDescription(description)
            .addFields(
                { name: 'Total Songs', value: queue.songs.length.toString(), inline: true },
                { name: 'Total Duration', value: queue.formattedDuration, inline: true },
                { name: 'Page', value: `${page}/${totalPages}`, inline: true }
            )
            .setThumbnail(queue.songs[0].thumbnail)
            .setFooter({ text: `Volume: ${queue.volume}% | Loop: ${queue.repeatMode ? (queue.repeatMode === 2 ? 'Queue' : 'Song') : 'Off'}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};