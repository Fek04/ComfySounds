const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('pomodoro')
		.setDescription('makes a pomodoro timer for you and either pings you in private or in a channel')
        .addIntegerOption(option =>
            option.setName('length')
            .setDescription('The length of one pomodor ranging from 15 to 60 minutes')
            .setMinValue(15)
            .setMaxValue(60)
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName('breaktime')
            .setDescription('The length of the break after a pomodoro ranging from 5 to 20 minutes')
            .setMinValue(5)
            .setMaxValue(20)
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName('count')
            .setDescription('How many pomodoros do you want to study?')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(true))
        .addBooleanOption(option =>
            option.setName('private')
            .setDescription('Do you want the timer for yourself (default) or for everyone in the channel?')
            .setRequired(false)),
	async execute(interaction) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        let userId = interaction.user;

        const pomodoroLength = interaction.options.getInteger('length');
        const breakTime = interaction.options.getInteger('breaktime');
        const count = interaction.options.getInteger('count');

        let ephemeral = interaction.options.getBoolean('private');
        if(ephemeral == null) ephemeral = true;
        else if(ephemeral == false) userId = interaction.channel;

        await interaction.reply({ content: 'Timer established, start studying now!', ephemeral: ephemeral });

        for (let i = 0; i < count; i++) {

            await delay(pomodoroLength*60*1000);
            
            if(i == count-1){
                userId.send({content: `Your study session is over! Be proud of yourself! In total you studied for ${Math.floor(pomodoroLength*count/60)} hours and ${(pomodoroLength*count)%60} minutes :thumbsup:`});
            }else{
                userId.send({content: `The pomodoro is over! Go do whatever for ${breakTime} minutes now! :partying_face:`});

                await delay(breakTime*60*1000-30000);

                userId.send({content: `Break is over in 30 seconds, get ready! :person_running:`});
                await delay(30000);
                userId.send({content: `No more break! Go study for another ${pomodoroLength} minutes now! :index_pointing_at_the_viewer:`});
            }
            
        }

	},
};