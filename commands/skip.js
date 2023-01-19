const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('skips the current song'),
	async execute(interaction) {

        if(interaction.client.queue.get(interaction.guildId)){
            interaction.client.player.stop();
            await interaction.reply('Skipped!');
        }else{
            await interaction.reply("You can't skip nothing, silly");
        }

	},
};