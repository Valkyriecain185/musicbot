const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'test',
    description: 'Test bot functionality',
    usage: '!test',
    async execute(message, args, { client, distube, db }) {
        console.log('=== BOT TEST COMMAND ===');
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔧 Bot Test Results')
            .setTimestamp();

        let results = [];

        // Test 1: Basic bot functionality
        results.push(`✅ Bot is responding`);
        results.push(`✅ Commands are loading`);

        // Test 2: Database connection
        try {
            await db.getGuildSettings(message.guild.id);
            results.push(`✅ Database connection working`);
        } catch (error) {
            results.push(`❌ Database error: ${error.message}`);
        }

        // Test 3: DisTube instance
        if (distube) {
            results.push(`✅ DisTube instance loaded`);
        } else {
            results.push(`❌ DisTube instance not found`);
        }

        // Test 4: Voice channel permissions
        const voiceChannel = message.member.voice.channel;
        if (voiceChannel) {
            const permissions = voiceChannel.permissionsFor(client.user);
            if (permissions.has('Connect') && permissions.has('Speak')) {
                results.push(`✅ Voice permissions OK`);
            } else {
                results.push(`❌ Missing voice permissions`);
            }
        } else {
            results.push(`⚠️ User not in voice channel`);
        }

        // Test 5: FFmpeg check
        try {
            const ffmpeg = require('ffmpeg-static');
            results.push(`✅ FFmpeg available: ${ffmpeg ? 'Yes' : 'No'}`);
        } catch (error) {
            results.push(`❌ FFmpeg error: ${error.message}`);
        }

        embed.setDescription(results.join('\n'));
        
        console.log('Test results:', results);
        message.reply({ embeds: [embed] });
    }
};