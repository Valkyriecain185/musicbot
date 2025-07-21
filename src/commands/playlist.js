const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Manage server playlists')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the playlist')
                        .setRequired(true)
                        .setMaxLength(50)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Show all playlists'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the playlist')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a song to a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the playlist')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('song')
                        .setDescription('YouTube URL of the song')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a song from a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the playlist')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('song_id')
                        .setDescription('ID of the song to remove')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name of the playlist')
                        .setRequired(true))),
    
    async execute(interaction, { distube, db }) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await this.createPlaylist(interaction, db);
                break;
            case 'list':
                await this.listPlaylists(interaction, db);
                break;
            case 'play':
                await this.playPlaylist(interaction, distube, db);
                break;
            case 'add':
                await this.addToPlaylist(interaction, db);
                break;
            case 'remove':
                await this.removeFromPlaylist(interaction, db);
                break;
            case 'delete':
                await this.deletePlaylist(interaction, db);
                break;
        }
    },

    async createPlaylist(interaction, db) {
        const name = interaction.options.getString('name');

        try {
            const existingPlaylists = await db.getPlaylists(interaction.guild.id);
            const exists = existingPlaylists.some(pl => pl.name.toLowerCase() === name.toLowerCase());
            
            if (exists) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Playlist Exists')
                    .setDescription(`A playlist named **${name}** already exists!`)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const playlistId = await db.createPlaylist(interaction.guild.id, name, interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Playlist Created')
                .setDescription(`Created playlist: **${name}**`)
                .addFields({ name: 'ID', value: playlistId.toString(), inline: true })
                .setFooter({ text: `Created by ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Create playlist error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to create playlist!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async listPlaylists(interaction, db) {
        try {
            const playlists = await db.getPlaylists(interaction.guild.id);
            
            if (!playlists.length) {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('📜 No Playlists')
                    .setDescription('This server has no playlists yet! Create one with `/playlist create`')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed] });
            }

            let description = '';
            for (const playlist of playlists) {
                const songs = await db.getPlaylistSongs(playlist.id);
                const creator = await interaction.client.users.fetch(playlist.created_by).catch(() => null);
                
                description += `**${playlist.name}** (ID: ${playlist.id})\n`;
                description += `Songs: ${songs.length} | Created by: ${creator ? creator.tag : 'Unknown'}\n`;
                description += `Created: <t:${Math.floor(new Date(playlist.created_at).getTime() / 1000)}:R>\n\n`;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📜 Playlists for ${interaction.guild.name}`)
                .setDescription(description)
                .setFooter({ text: 'Use /playlist play <name> to play a playlist' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('List playlists error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to fetch playlists!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async playPlaylist(interaction, distube, db) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('You need to be in a voice channel to play music!')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const name = interaction.options.getString('name');

        try {
            const playlists = await db.getPlaylists(interaction.guild.id);
            const playlist = playlists.find(pl => pl.name.toLowerCase() === name.toLowerCase());
            
            if (!playlist) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Playlist Not Found')
                    .setDescription(`No playlist named **${name}** found!`)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const songs = await db.getPlaylistSongs(playlist.id);
            
            if (!songs.length) {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('📜 Empty Playlist')
                    .setDescription(`Playlist **${name}** is empty!`)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('🔍 Loading Playlist...')
                .setDescription(`Loading **${songs.length}** songs from playlist **${name}**...`)
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });

            // Play each song in the playlist
            for (const song of songs) {
                try {
                    await distube.play(voiceChannel, song.url, {
                        textChannel: interaction.channel,
                        member: interaction.member
                    });
                } catch (error) {
                    console.error(`Error playing song ${song.title}:`, error);
                }
            }

        } catch (error) {
            console.error('Play playlist error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to play playlist!')
                .setTimestamp();
            
            if (interaction.replied) {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },

    async addToPlaylist(interaction, db) {
        const playlistName = interaction.options.getString('name');
        const songUrl = interaction.options.getString('song');

        try {
            const playlists = await db.getPlaylists(interaction.guild.id);
            const playlist = playlists.find(pl => pl.name.toLowerCase() === playlistName.toLowerCase());
            
            if (!playlist) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Playlist Not Found')
                    .setDescription(`No playlist named **${playlistName}** found!`)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Validate YouTube URL
            if (!songUrl.includes('youtube.com') && !songUrl.includes('youtu.be')) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid URL')
                    .setDescription('Please provide a valid YouTube URL!')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // For simplicity, we'll extract title from URL or use a placeholder
            // In a real implementation, you'd want to fetch video details
            const title = `Song from ${songUrl.split('v=')[1]?.substring(0, 11) || 'YouTube'}`;
            
            await db.addSongToPlaylist(playlist.id, title, songUrl, 0, interaction.user.id);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Song Added')
                .setDescription(`Added song to playlist **${playlist.name}**`)
                .addFields({ name: 'Song', value: `[${title}](${songUrl})` })
                .setFooter({ text: `Added by ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Add to playlist error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to add song to playlist!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async removeFromPlaylist(interaction, db) {
        const playlistName = interaction.options.getString('name');
        const songId = interaction.options.getInteger('song_id');

        try {
            const playlists = await db.getPlaylists(interaction.guild.id);
            const playlist = playlists.find(pl => pl.name.toLowerCase() === playlistName.toLowerCase());
            
            if (!playlist) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Playlist Not Found')
                    .setDescription(`No playlist named **${playlistName}** found!`)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await db.removeSongFromPlaylist(songId);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Song Removed')
                .setDescription(`Removed song from playlist **${playlist.name}**`)
                .setFooter({ text: `Removed by ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Remove from playlist error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to remove song from playlist!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },

    async deletePlaylist(interaction, db) {
        const name = interaction.options.getString('name');

        try {
            const playlists = await db.getPlaylists(interaction.guild.id);
            const playlist = playlists.find(pl => pl.name.toLowerCase() === name.toLowerCase());
            
            if (!playlist) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Playlist Not Found')
                    .setDescription(`No playlist named **${name}** found!`)
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Check if user has permission (playlist creator or admin)
            if (playlist.created_by !== interaction.user.id && !interaction.member.permissions.has('Administrator')) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ No Permission')
                    .setDescription('You can only delete playlists you created or need Administrator permission!')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            await db.deletePlaylist(playlist.id);
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Playlist Deleted')
                .setDescription(`Deleted playlist: **${name}**`)
                .setFooter({ text: `Deleted by ${interaction.user.tag}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Delete playlist error:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('Failed to delete playlist!')
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};