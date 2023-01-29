const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('skips the current song'),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        if(server_queue){
            server_queue.player.stop();
            await interaction.reply('Skipped!');
        }else{
            await interaction.reply({ content:"You can't skip nothing, silly", ephemeral: true });
        }

	},
};