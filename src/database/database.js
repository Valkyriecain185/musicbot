const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    constructor() {
        this.pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    async init() {
        try {
            // Create tables if they don't exist
            await this.createTables();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async createTables() {
        const createGuildsTable = `
            CREATE TABLE IF NOT EXISTS guilds (
                id VARCHAR(20) PRIMARY KEY,
                name VARCHAR(255),
                prefix VARCHAR(10) DEFAULT '!',
                volume INT DEFAULT 50,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

        const createPlaylistsTable = `
            CREATE TABLE IF NOT EXISTS playlists (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20),
                name VARCHAR(255),
                created_by VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
            )
        `;

        const createPlaylistSongsTable = `
            CREATE TABLE IF NOT EXISTS playlist_songs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                playlist_id INT,
                title VARCHAR(500),
                url VARCHAR(500),
                duration INT,
                added_by VARCHAR(20),
                added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
            )
        `;

        const createPlayHistoryTable = `
            CREATE TABLE IF NOT EXISTS play_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                guild_id VARCHAR(20),
                title VARCHAR(500),
                url VARCHAR(500),
                played_by VARCHAR(20),
                played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE
            )
        `;

        await this.pool.execute(createGuildsTable);
        await this.pool.execute(createPlaylistsTable);
        await this.pool.execute(createPlaylistSongsTable);
        await this.pool.execute(createPlayHistoryTable);
    }

    async addGuild(guildId, guildName) {
        const query = `
            INSERT INTO guilds (id, name) 
            VALUES (?, ?) 
            ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP
        `;
        await this.pool.execute(query, [guildId, guildName]);
    }

    async getGuildSettings(guildId) {
        const query = 'SELECT * FROM guilds WHERE id = ?';
        const [rows] = await this.pool.execute(query, [guildId]);
        return rows[0] || null;
    }

    async updateGuildPrefix(guildId, prefix) {
        const query = 'UPDATE guilds SET prefix = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await this.pool.execute(query, [prefix, guildId]);
    }

    async updateGuildVolume(guildId, volume) {
        const query = 'UPDATE guilds SET volume = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        await this.pool.execute(query, [volume, guildId]);
    }

    async createPlaylist(guildId, name, createdBy) {
        const query = 'INSERT INTO playlists (guild_id, name, created_by) VALUES (?, ?, ?)';
        const [result] = await this.pool.execute(query, [guildId, name, createdBy]);
        return result.insertId;
    }

    async getPlaylists(guildId) {
        const query = 'SELECT * FROM playlists WHERE guild_id = ? ORDER BY created_at DESC';
        const [rows] = await this.pool.execute(query, [guildId]);
        return rows;
    }

    async getPlaylist(playlistId) {
        const query = 'SELECT * FROM playlists WHERE id = ?';
        const [rows] = await this.pool.execute(query, [playlistId]);
        return rows[0] || null;
    }

    async deletePlaylist(playlistId) {
        const query = 'DELETE FROM playlists WHERE id = ?';
        await this.pool.execute(query, [playlistId]);
    }

    async addSongToPlaylist(playlistId, title, url, duration, addedBy) {
        const query = 'INSERT INTO playlist_songs (playlist_id, title, url, duration, added_by) VALUES (?, ?, ?, ?, ?)';
        await this.pool.execute(query, [playlistId, title, url, duration, addedBy]);
    }

    async getPlaylistSongs(playlistId) {
        const query = 'SELECT * FROM playlist_songs WHERE playlist_id = ? ORDER BY added_at ASC';
        const [rows] = await this.pool.execute(query, [playlistId]);
        return rows;
    }

    async removeSongFromPlaylist(songId) {
        const query = 'DELETE FROM playlist_songs WHERE id = ?';
        await this.pool.execute(query, [songId]);
    }

    async addToPlayHistory(guildId, title, url, playedBy) {
        const query = 'INSERT INTO play_history (guild_id, title, url, played_by) VALUES (?, ?, ?, ?)';
        await this.pool.execute(query, [guildId, title, url, playedBy]);
    }

    async getPlayHistory(guildId, limit = 10) {
        const query = 'SELECT * FROM play_history WHERE guild_id = ? ORDER BY played_at DESC LIMIT ?';
        const [rows] = await this.pool.execute(query, [guildId, limit]);
        return rows;
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = Database;