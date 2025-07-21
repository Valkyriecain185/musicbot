const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist from YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name, URL, or playlist URL')
                .setRequired(true)),
    
    async execute(interaction, { distube }) {
        const query = interaction.options.getString('query');
        
        console.log('Play slash command executed');
        console.log('User:', interaction.user.tag);
        console.log('Guild:', interaction.guild.name);
        
        const voiceChannel = interaction.member.voice.channel;
        console.log('Voice channel:', voiceChannel ? voiceChannel.name : 'None');
        
        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('You need to be in a voice channel to play music!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }

        // Check bot permissions
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        console.log('Bot permissions:', {
            connect: permissions.has('Connect'),
            speak: permissions.has('Speak'),
            viewChannel: permissions.has('ViewChannel')
        });

        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('I need the permissions to join and speak in your voice channel!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed] });
        }

        console.log('Query:', query);

        try {
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('🔍 Searching...')
                .setDescription(`Searching for: **${query}**`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            console.log('Starting DisTube play...');

            // Test if DisTube is working
            console.log('DisTube instance:', !!distube);
            console.log('Voice channel ID:', voiceChannel.id);
            console.log('Text channel ID:', interaction.channel.id);

            await distube.play(voiceChannel, query, {
                textChannel: interaction.channel,
                member: interaction.member
            });

            console.log('DisTube play command completed successfully');

            // Edit the reply after a short delay
            setTimeout(async () => {
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Request Processed')
                    .setDescription('Your music request is being processed!')
                    .setTimestamp();
                
                try {
                    await interaction.editReply({ embeds: [successEmbed] });
                } catch (err) {
                    console.log('Could not edit reply:', err.message);
                }
            }, 3000);

        } catch (error) {
            console.error('Play command error details:');
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error code:', error.code);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while trying to play the music!')
                .addFields({ 
                    name: 'Error Details', 
                    value: `\`\`\`${error.message || 'Unknown error'}\`\`\`` 
                })
                .setTimestamp();
            
            if (interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed] });
            }
        }
    }
};