const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed info about a specific command')
                .setRequired(false)),
    
    async execute(interaction, { client }) {
        const commandName = interaction.options.getString('command');
        
        if (commandName) {
            // Show specific command help
            const command = client.commands.get(commandName);
            
            if (!command) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Command Not Found')
                    .setDescription(`No command named **${commandName}** found!`)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📖 Command: /${command.data.name}`)
                .setDescription(command.data.description || 'No description available')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Show all commands
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Music Bot Commands')
            .setDescription('All commands are now slash commands! Just type `/` and start typing to see available options.')
            .addFields(
                {
                    name: '🎶 Music Commands',
                    value: [
                        '`/play <query>` - Play music from YouTube',
                        '`/queue [page]` - Show the current queue',
                        '`/skip` - Skip the current song',
                        '`/stop` - Stop music and clear queue',
                        '`/volume [level]` - Change or show volume',
                        '`/pause` - Pause the current song',
                        '`/resume` - Resume paused music',
                        '`/loop [mode]` - Toggle loop mode',
                        '`/shuffle` - Shuffle the queue',
                        '`/nowplaying` - Show current song'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📜 Playlist Commands',
                    value: [
                        '`/playlist create <name>` - Create a playlist',
                        '`/playlist list` - Show all playlists',
                        '`/playlist play <name>` - Play a playlist',
                        '`/playlist add <name> <song>` - Add song to playlist',
                        '`/playlist remove <name> <id>` - Remove song',
                        '`/playlist delete <name>` - Delete a playlist'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚙️ Utility Commands',
                    value: [
                        '`/history [limit]` - Show play history',
                        '`/search <query>` - Search for songs',
                        '`/prefix <new_prefix>` - Change bot prefix',
                        '`/help [command]` - Show this help message'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Bot developed with ❤️ | Now with slash commands!',
                iconURL: client.user.displayAvatarURL()
            })
            .setThumbnail(client.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};