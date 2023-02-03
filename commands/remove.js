const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('remove')
		.setDescription('romeves specified song from queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('removes song in queue with this index (check index with displayqueue)')
                .setRequired(true)),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        let position = interaction.options.getInteger('position');
        if(position > 0 && server_queue && server_queue.songs.length >= position-1){
            let song = server_queue.songs[position];
            server_queue.songs.splice(position,1);

            await interaction.reply({ content: `Removed "${song.title}"`, ephemeral: false });
        }else{
            await interaction.reply({ content: 'Wrong index or no queue!', ephemeral: true });
        }

	},
};