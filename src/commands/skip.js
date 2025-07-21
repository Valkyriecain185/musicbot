const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),
    
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

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== queue.voiceChannel.id) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('You need to be in the same voice channel as the bot!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            const currentSong = queue.songs[0];
            await distube.skip(interaction.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('⏭️ Song Skipped')
                .setDescription(`Skipped: **[${currentSong.name}](${currentSong.url})**`)
                .setFooter({ text: `Skipped by ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Skip command error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to skip the song!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};