const { Events } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		console.log(generateDependencyReport());
	},
};
