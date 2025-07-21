const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume paused music'),
    
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

        if (!queue.paused) {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('▶️ Not Paused')
                .setDescription('The music is not paused!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        distube.resume(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('▶️ Music Resumed')
            .setDescription('Music has been resumed!')
            .setFooter({ text: `Resumed by ${interaction.user.tag}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};