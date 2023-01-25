const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unpause')
		.setDescription('unpauses the player'),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        if(server_queue){
            server_queue.player.unpause();
            await interaction.reply('Unpaused!');
        }else{
            await interaction.reply("You can't unpause nothing, silly");
        }

	},
};