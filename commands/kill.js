const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('kill')
		.setDescription('destroys the player and the connection'),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        if(server_queue){
            server_queue.connection.destroy();
            server_queue.player = undefined;
            interaction.client.queue.delete(interaction.guildId);
            await interaction.reply('killed');
        }else{
            await interaction.reply({ content:"Already dead", ephemeral: true });
        }

	},
};