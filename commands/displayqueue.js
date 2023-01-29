const { SlashCommandBuilder } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('displayqueue')
		.setDescription('displays the queue, duh'),
	async execute(interaction) {
        server_queue = interaction.client.queue.get(interaction.guildId);
        if(server_queue && server_queue.songs.length > 1){

            let workingQueue = server_queue.songs.slice(1,-1);
            
            const embed = generateEmbed(workingQueue,0);
            
            await interaction.reply({ embeds: [embed] });
        
        }else{
            await interaction.reply({ content:"Nothing in the queue!", ephemeral: true });
        }

	},
};

const generateEmbed = (queue, start) => {
    const embedLength = 20;

    const current = queue.slice(start, start + embedLength)

    const canFitOnOnePage = queue.length <= embedLength;
    let description = "";
    
    for(let i = 0; i < current.length; i++){
        description += (i+1)+": "+ current[i].title + "\n";
    }
    if(!canFitOnOnePage){
        description += `...plus ${queue.length-embedLength} songs`
    }

    return new EmbedBuilder()
        .setColor('#a6ffb0')
        .setTitle(`Showing Queue`)
        .setDescription(description);
}   