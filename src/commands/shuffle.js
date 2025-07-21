const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current queue'),
    
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

        if (queue.songs.length < 3) {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('❌ Not Enough Songs')
                .setDescription('Need at least 3 songs in queue to shuffle!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        distube.shuffle(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔀 Queue Shuffled')
            .setDescription('The queue has been shuffled!')
            .setFooter({ text: `Shuffled by ${interaction.user.tag}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};