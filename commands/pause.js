const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('pauses the player'),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        if(server_queue){
            server_queue.player.pause();
            await interaction.reply('Paused!');
        }else{
            await interaction.reply({ content:"You can't pause nothing, silly", ephemeral: true });
        }

	},
};