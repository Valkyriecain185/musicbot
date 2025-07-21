const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),
    
    async execute(interaction, { distube }) {
        const queue = distube.getQueue(interaction.guild.id);
        
        if (!queue) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ No Music')
                .setDescription('There is no music playing!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }

        const song = queue.songs[0];
        const progress = queue.currentTime;
        const duration = song.duration;
        
        // Create progress bar
        const progressBar = this.createProgressBar(progress, duration);
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields(
                { name: 'Duration', value: `${this.formatTime(progress)} / ${song.formattedDuration}`, inline: true },
                { name: 'Requested by', value: song.user.toString(), inline: true },
                { name: 'Volume', value: `${queue.volume}%`, inline: true },
                { name: 'Progress', value: progressBar, inline: false },
                { name: 'Loop', value: queue.repeatMode ? (queue.repeatMode === 2 ? 'Queue' : 'Song') : 'Off', inline: true },
                { name: 'Paused', value: queue.paused ? 'Yes' : 'No', inline: true },
                { name: 'Queue Length', value: `${queue.songs.length} song(s)`, inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },

    createProgressBar(current, total, length = 20) {
        const progress = Math.round((current / total) * length);
        const emptyProgress = length - progress;
        
        const progressText = '▰'.repeat(progress);
        const emptyProgressText = '▱'.repeat(emptyProgress);
        
        return progressText + emptyProgressText;
    },

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
};