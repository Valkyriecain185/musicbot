const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),
    
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

        if (queue.paused) {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('⏸️ Already Paused')
                .setDescription('The music is already paused!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        distube.pause(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('⏸️ Music Paused')
            .setDescription('Music has been paused!')
            .setFooter({ text: `Paused by ${interaction.user.tag}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};
