const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clearqueue')
		.setDescription('deletes all songs in the queue'),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        if(server_queue){
            server_queue.songs.splice(1, Infinity);
            await interaction.reply('Queue cleared!');
        }else{
            await interaction.reply({ content:"There is no queue to clear", ephemeral: true });
        }

	},
};