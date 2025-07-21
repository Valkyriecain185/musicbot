const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, REST, Routes, Collection } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const Database = require('./database/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Initialize database
const db = new Database();

// Initialize DisTube
const distube = new DisTube(client, {
    leaveOnStop: true,
    leaveOnFinish: true,
    leaveOnEmpty: true,
    emptyCooldown: 20,
    emitNewSongOnly: true,
    emitAddSongWhenCreatingQueue: false,
    emitAddListWhenCreatingQueue: false,
    plugins: [new YtDlpPlugin()]
});

// Initialize commands collection
client.commands = new Collection();

// Enhanced command loader with folder support
function loadCommands() {
    console.log('📂 Loading commands...');
    
    const commandsPath = path.join(__dirname, 'src', 'commands');
    
    console.log(`🔍 Looking for commands in: ${commandsPath}`);
    
    if (!fs.existsSync(commandsPath)) {
        console.error('❌ Commands folder not found!');
        console.log('💡 Expected path:', commandsPath);
        console.log('💡 Current working directory:', process.cwd());
        console.log('💡 __dirname:', __dirname);
        
        // Try alternative paths
        const altPaths = [
            path.join(__dirname, 'commands'),
            path.join(process.cwd(), 'commands'),
            path.join(process.cwd(), 'src', 'commands')
        ];
        
        console.log('🔍 Checking alternative paths:');
        for (const altPath of altPaths) {
            const exists = fs.existsSync(altPath);
            console.log(`  ${exists ? '✅' : '❌'} ${altPath}`);
            if (exists) {
                console.log(`💡 Found commands at: ${altPath}`);
                // Update the path and continue
                return loadCommandsFromPath(altPath);
            }
        }
        return;
    }
    
    return loadCommandsFromPath(commandsPath);
}

function loadCommandsFromPath(commandsPath) {
    console.log(`📁 Loading from: ${commandsPath}`);
    
    const commandFolders = fs.readdirSync(commandsPath);
    let commandCount = 0;
    let errorCount = 0;
    
    console.log(`📋 Found ${commandFolders.length} items in commands directory:`, commandFolders);
    
    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        
        // Handle both files directly in commands/ and subfolders
        if (fs.statSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
            
            console.log(`📁 Loading ${commandFiles.length} commands from ${folder}/`);
            
            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const result = loadSingleCommand(filePath, file);
                if (result.success) commandCount++;
                else errorCount++;
            }
        } else if (folder.endsWith('.js')) {
            // Handle files directly in commands folder
            const result = loadSingleCommand(folderPath, folder);
            if (result.success) commandCount++;
            else errorCount++;
        } else {
            console.log(`⏭️ Skipping non-JS file: ${folder}`);
        }
    }
    
    console.log(`✅ Loaded ${commandCount} commands total`);
    if (errorCount > 0) {
        console.log(`⚠️ Failed to load ${errorCount} commands`);
    }
    console.log('');
}

function loadSingleCommand(filePath, fileName) {
    try {
        // Clear require cache to allow hot reloading
        delete require.cache[require.resolve(filePath)];
        
        const command = require(filePath);
        
        console.log(`🔍 Examining ${fileName}:`, {
            hasData: !!command.data,
            hasExecute: !!command.execute,
            dataName: command.data?.name,
            dataDescription: command.data?.description
        });
        
        if ('data' in command && 'execute' in command) {
            // Validate command structure
            const validation = validateCommand(command);
            if (!validation.valid) {
                console.log(`  ❌ ${fileName} - Validation errors:`);
                validation.errors.forEach(error => console.log(`    • ${error}`));
                return { success: false };
            }
            
            client.commands.set(command.data.name, command);
            console.log(`  ✅ ${command.data.name}`);
            return { success: true };
        } else {
            console.log(`  ❌ ${fileName} - Missing required 'data' or 'execute' properties`);
            return { success: false };
        }
    } catch (error) {
        console.error(`  ❌ ${fileName} - Error loading:`, error.message);
        console.error(`  📍 Full error:`, error);
        return { success: false };
    }
}

// Command validation function
function validateCommand(command) {
    const errors = [];
    
    if (!command.data || !command.data.name || !command.data.description) {
        errors.push('Missing required data, name, or description');
        return { valid: false, errors };
    }
    
    // Check if command has options
    if (command.data.options && Array.isArray(command.data.options)) {
        let foundOptional = false;
        
        for (let i = 0; i < command.data.options.length; i++) {
            const option = command.data.options[i];
            
            // Check if this option is required
            const isRequired = option.required === true;
            
            if (!isRequired) {
                foundOptional = true;
            } else if (foundOptional && isRequired) {
                errors.push(`Option "${option.name}" is required but comes after optional options. Required options must come first.`);
            }
        }
    }
    
    // Check subcommands if they exist
    if (command.data.options) {
        for (const option of command.data.options) {
            if (option.type === 1 || option.type === 2) { // SUB_COMMAND or SUB_COMMAND_GROUP
                if (option.options && Array.isArray(option.options)) {
                    let foundOptional = false;
                    
                    for (const subOption of option.options) {
                        const isRequired = subOption.required === true;
                        
                        if (!isRequired) {
                            foundOptional = true;
                        } else if (foundOptional && isRequired) {
                            errors.push(`Subcommand "${option.name}" has required option "${subOption.name}" after optional options.`);
                        }
                    }
                }
            }
        }
    }
    
    return { valid: errors.length === 0, errors };
}

// Enhanced command deployment with wipe functionality
async function deployCommands() {
    console.log('🚀 Starting command deployment...');
    console.log(`📊 Commands in collection: ${client.commands.size}`);
    
    if (client.commands.size === 0) {
        console.log('❌ No commands found in collection!');
        console.log('💡 Make sure commands are loaded before deployment');
        return { success: false, error: 'No commands in collection' };
    }
    
    const commands = [];
    
    // Collect all commands with better validation
    for (const [commandName, command] of client.commands) {
        console.log(`🔍 Processing command: ${commandName}`);
        
        try {
            if (!command.data) {
                console.log(`⚠️ Skipping ${commandName} - No data property`);
                continue;
            }
            
            if (typeof command.data.toJSON !== 'function') {
                console.log(`⚠️ Skipping ${commandName} - data.toJSON is not a function`);
                console.log(`  Command data type: ${typeof command.data}`);
                console.log(`  Command data:`, command.data);
                continue;
            }
            
            const commandData = command.data.toJSON();
            
            // Validate required fields
            if (!commandData.name || !commandData.description) {
                console.log(`⚠️ Skipping ${commandName} - Missing name or description`);
                console.log(`  Name: ${commandData.name}`);
                console.log(`  Description: ${commandData.description}`);
                continue;
            }
            
            // Remove default member permissions to make commands visible to developers
            delete commandData.default_member_permissions;
            
            commands.push(commandData);
            console.log(`  ✅ Prepared: ${commandData.name}`);
        } catch (error) {
            console.error(`❌ Error processing command ${commandName}:`, error.message);
            console.error(`  Command structure:`, command);
        }
    }
    
    if (commands.length === 0) {
        console.log('❌ No valid commands found to deploy!');
        console.log('💡 Check that your command files:');
        console.log('  - Export an object with "data" and "execute" properties');
        console.log('  - Use SlashCommandBuilder for the "data" property');
        console.log('  - Have proper name and description');
        return { success: false, error: 'No valid commands found' };
    }
    
    console.log(`📋 Preparing to deploy ${commands.length} commands...`);
    
    // Validate environment variables
    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
        console.error('❌ Missing required environment variables: DISCORD_TOKEN and CLIENT_ID');
        return;
    }
    
    const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        // Deploy to specific guild (faster, for development)
        if (process.env.GUILD_ID) {
            console.log(`🏠 Deploying to guild: ${process.env.GUILD_ID}`);
            
            console.log('🧹 Wiping existing guild commands...');
            
            // Clear all existing guild commands first
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: [] }
            );
            console.log('✅ Existing guild commands cleared');
            
            // Small delay to ensure clearing is processed
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log('📡 Deploying new guild commands...');
            const result = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands }
            );
            
            console.log(`✅ Successfully deployed ${result.length} guild commands!`);
            
        } else {
            // Deploy globally (slower, for production)
            console.log('🌐 Deploying globally...');
            
            console.log('🧹 Wiping existing global commands...');
            
            // Clear all existing global commands first
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: [] }
            );
            console.log('✅ Existing global commands cleared');
            
            // Longer delay for global commands
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('🌐 Deploying new global commands (may take up to 1 hour)...');
            const result = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );
            
            console.log(`✅ Successfully deployed ${result.length} global commands!`);
        }
        
        // List deployed commands
        console.log('📋 Deployed commands:');
        commands.forEach((cmd, index) => {
            console.log(`  ${index + 1}. ${cmd.name} - ${cmd.description}`);
        });
        
        console.log('');
        console.log('🎉 Command deployment complete!');
        console.log('💡 All old commands have been wiped and replaced with current ones');
        
        return { success: true, count: commands.length };
        
    } catch (error) {
        console.error('❌ Command deployment failed:', error);
        
        // More detailed error logging
        if (error.code === 50001) {
            console.error('💡 Missing Access: Make sure the bot has the applications.commands scope');
        } else if (error.code === 50013) {
            console.error('💡 Missing Permissions: Make sure the bot has proper permissions in the guild');
        } else if (error.rawError?.errors) {
            console.error('💡 Command Validation Errors:');
            console.error(JSON.stringify(error.rawError.errors, null, 2));
        } else if (error.status === 401) {
            console.error('💡 Invalid Bot Token: Check your DISCORD_TOKEN in .env file');
        } else if (error.status === 404) {
            console.error('💡 Invalid Client ID: Check your CLIENT_ID in .env file');
        }
        
        return { success: false, error: error.message };
    }
}

client.once('ready', async () => {
    console.log('🤖 Bot is starting up...');
    console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);
    console.log('');
    
    try {
        console.log('🗄️ Initializing database...');
        await db.init();
        console.log('✅ Database connection established');
        console.log('');
    } catch (error) {
        console.error('❌ Failed to connect to database:', error);
        process.exit(1);
    }
    
    // Load commands and events
    loadCommands();
    
    // Deploy slash commands
    const deployResult = await deployCommands();
    
    if (deployResult && deployResult.success) {
        console.log(`🎯 ${deployResult.count} commands are ready for use!`);
    } else {
        console.error('⚠️ Command deployment had issues - check logs above');
    }
    
    // Set bot activity
    client.user.setActivity('Music | /help', { type: ActivityType.Listening });
    
    console.log('🎵 Music bot is now online and ready!');
    console.log('');
});

client.on('guildCreate', async (guild) => {
    try {
        await db.addGuild(guild.id, guild.name);
        console.log(`Added to new guild: ${guild.name} (${guild.id})`);
    } catch (error) {
        console.error('Error adding guild to database:', error);
    }
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, { client, distube, db });
    } catch (error) {
        console.error('Error executing slash command:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Error')
            .setDescription('There was an error executing this command!')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
});

// Keep old message command support for backward compatibility
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Get guild settings for prefix
    let guildSettings;
    try {
        guildSettings = await db.getGuildSettings(message.guild.id);
        if (!guildSettings) {
            await db.addGuild(message.guild.id, message.guild.name);
            guildSettings = { prefix: process.env.PREFIX || '!' };
        }
    } catch (error) {
        console.error('Error getting guild settings:', error);
        guildSettings = { prefix: process.env.PREFIX || '!' };
    }
    
    const prefix = guildSettings.prefix;
    
    if (!message.content.startsWith(prefix)) return;
    
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    // Find slash command equivalent and suggest it
    const slashCommand = client.commands.find(cmd => 
        cmd.data.name === commandName || 
        (cmd.aliases && cmd.aliases.includes(commandName))
    );
    
    if (slashCommand) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('💡 Use Slash Commands!')
            .setDescription(`This bot now uses slash commands! Use \`/${slashCommand.data.name}\` instead of \`${prefix}${commandName}\``)
            .addFields({
                name: 'Why slash commands?',
                value: '• Better user experience\n• Auto-completion\n• Built-in help text\n• More reliable'
            })
            .setTimestamp();
        
        message.reply({ embeds: [embed] });
    }
});

// DisTube Events (same as before)
distube
    .on('playSong', async (queue, song) => {
        console.log('DisTube: Playing song:', song.name);
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🎵 Now Playing')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields(
                { name: 'Duration', value: song.formattedDuration, inline: true },
                { name: 'Requested by', value: song.user.toString(), inline: true },
                { name: 'Queue', value: `${queue.songs.length} song(s)`, inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();
        
        queue.textChannel.send({ embeds: [embed] });
        
        // Add to play history
        try {
            await db.addToPlayHistory(queue.textChannel.guild.id, song.name, song.url, song.user.id);
        } catch (error) {
            console.error('Error adding to play history:', error);
        }
    })
    .on('addSong', (queue, song) => {
        console.log('DisTube: Added song to queue:', song.name);
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('✅ Added to Queue')
            .setDescription(`**[${song.name}](${song.url})**`)
            .addFields(
                { name: 'Duration', value: song.formattedDuration, inline: true },
                { name: 'Position in queue', value: `#${queue.songs.length}`, inline: true },
                { name: 'Requested by', value: song.user.toString(), inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();
        
        queue.textChannel.send({ embeds: [embed] });
    })
    .on('addList', (queue, playlist) => {
        console.log('DisTube: Added playlist:', playlist.name, 'with', playlist.songs.length, 'songs');
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📜 Playlist Added')
            .setDescription(`**${playlist.name}**`)
            .addFields(
                { name: 'Songs', value: playlist.songs.length.toString(), inline: true },
                { name: 'Duration', value: playlist.formattedDuration, inline: true },
                { name: 'Requested by', value: playlist.user.toString(), inline: true }
            )
            .setThumbnail(playlist.thumbnail)
            .setTimestamp();
        
        queue.textChannel.send({ embeds: [embed] });
    })
    .on('searchResult', (message, result) => {
        console.log('DisTube: Search completed, found', result.length, 'results');
    })
    .on('searchCancel', (message) => {
        console.log('DisTube: Search cancelled');
    })
    .on('searchInvalidAnswer', (message) => {
        console.log('DisTube: Invalid search answer');
    })
    .on('searchNoResult', (message) => {
        console.log('DisTube: No search results found');
        
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ No Results')
            .setDescription('No songs found for your search!')
            .setTimestamp();
        
        message.reply({ embeds: [embed] });
    })
    .on('error', (channel, error) => {
        console.error('=== DisTube Error ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error code:', error.code);
        console.error('Channel:', channel ? channel.name : 'No channel');
        console.error('=====================');
        
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Music Error')
                .setDescription(`An error occurred while playing music!\n\`\`\`${error.message}\`\`\``)
                .setTimestamp();
            
            channel.send({ embeds: [embed] });
        }
    })
    .on('empty', (queue) => {
        console.log('DisTube: Voice channel empty, leaving...');
        
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('👋 Goodbye!')
            .setDescription('Voice channel is empty! Leaving the channel...')
            .setTimestamp();
        
        queue.textChannel.send({ embeds: [embed] });
    })
    .on('finish', (queue) => {
        console.log('DisTube: Queue finished');
        
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('✅ Queue Finished')
            .setDescription('No more songs in the queue!')
            .setTimestamp();
        
        queue.textChannel.send({ embeds: [embed] });
    })
    .on('disconnect', (queue) => {
        console.log('DisTube: Disconnected from voice channel');
    })
    .on('initQueue', (queue) => {
        console.log('DisTube: Queue initialized for guild:', queue.textChannel.guild.name);
        
        // Set default volume from database
        db.getGuildSettings(queue.textChannel.guild.id).then(settings => {
            if (settings && settings.volume) {
                queue.volume = settings.volume;
                console.log('Set queue volume to:', settings.volume);
            }
        }).catch(console.error);
    });

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await db.close();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await db.close();
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);