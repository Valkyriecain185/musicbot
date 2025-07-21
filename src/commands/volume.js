const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Change or show the current volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (1-100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)),
    
    async execute(interaction, { distube, db }) {
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

        const volume = interaction.options.getInteger('level');

        if (!volume) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🔊 Current Volume')
                .setDescription(`The current volume is **${queue.volume}%**`)
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }

        try {
            distube.setVolume(interaction.guild.id, volume);
            
            // Save volume to database
            await db.updateGuildVolume(interaction.guild.id, volume);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🔊 Volume Changed')
                .setDescription(`Volume set to **${volume}%**`)
                .setFooter({ text: `Changed by ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Volume command error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to change the volume!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};