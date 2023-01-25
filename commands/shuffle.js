const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('shuffles the current queue'),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        if(server_queue && server_queue.songs.length > 1){
            let first = server_queue.songs[0];
            let res = [];
            let newQueue = server_queue.songs.slice(1, server_queue.songs.length);

            while (newQueue.length > 0) {
                let index = Math.floor(Math.random()*newQueue.length);
                res.push(newQueue[index]);
                newQueue.splice(index,1);
            }

            res.splice(0,0,first);
            server_queue.songs = res;

            await interaction.reply({ content: 'Shuffled!', ephemeral: false });
        }else{
            await interaction.reply({ content: 'Nothing to shuffle!', ephemeral: true });
        }

	},
};