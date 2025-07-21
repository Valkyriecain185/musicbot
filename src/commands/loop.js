const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode to set')
                .setRequired(false)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Song', value: 'song' },
                    { name: 'Queue', value: 'queue' }
                )),
    
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

        let mode = 0;
        let modeText = 'Off';
        const modeOption = interaction.options.getString('mode');
        
        if (modeOption) {
            switch (modeOption) {
                case 'off':
                    mode = 0;
                    modeText = 'Off';
                    break;
                case 'song':
                    mode = 1;
                    modeText = 'Song';
                    break;
                case 'queue':
                    mode = 2;
                    modeText = 'Queue';
                    break;
            }
        } else {
            // Cycle through modes
            mode = queue.repeatMode + 1;
            if (mode > 2) mode = 0;
            
            switch (mode) {
                case 0: modeText = 'Off'; break;
                case 1: modeText = 'Song'; break;
                case 2: modeText = 'Queue'; break;
            }
        }

        distube.setRepeatMode(interaction.guild.id, mode);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔄 Loop Mode Changed')
            .setDescription(`Loop mode set to: **${modeText}**`)
            .setFooter({ text: `Changed by ${interaction.user.tag}` })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};
