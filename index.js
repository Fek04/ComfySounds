const fs = require('node:fs');
const path = require('node:path');
const ytdl = require('ytdl-core');

// Require the necessary discord.js classes
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus, createAudioResource, createAudioPlayer } = require('@discordjs/voice');

const { token } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: 
	[GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildVoiceStates] });

// Attach all queues to instance 
client.queue = new Map();

//converts hsl colors to hex colors
function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

// function that keeps playing all the songs, attached to client to make it global
client.video_player = (interaction) => {
	const guild = interaction.guild;
    const song_queue = interaction.client.queue.get(guild.id);
	const song = song_queue.songs[0];

    let audioPlayer = song_queue.player;

    // If queue does not have any more songs, destroy queue and connection
    if(!song) {
        song_queue.connection.destroy();
        song_queue.player = undefined;
        interaction.client.queue.delete(guild.id);
        return;
    }

    song_queue.hue_value = (song_queue.hue_value + 15) % 360;

    // Establish AudioPlayer
    if(!audioPlayer){
        audioPlayer = createAudioPlayer();
        song_queue.connection.subscribe(audioPlayer);
        song_queue.player = audioPlayer;
    }

    //Get stream using ytdl and play this stream // 
    const next = ytdl(song.url, { filter: 'audioonly' , highWaterMark: 1<<25, bitrate: 200 }).
    on('info', (info) => {
        let songLength = new Date(info.videoDetails.lengthSeconds * 1000).toISOString().slice(11, 19);

        let songEmbed = new EmbedBuilder()
            .setColor(hslToHex(song_queue.hue_value,100,75))
            .setTitle(song.title)
            .setURL(song.url)
            .addFields(
                { name: 'View Count', value: info.videoDetails.viewCount, inline: true},
                { name: 'Length', value: songLength, inline: true},
            )
            .setImage(info.videoDetails.thumbnails[info.videoDetails.thumbnails.length-1].url);
        song_queue.text_channel.send({ embeds: [songEmbed]});
    });

    audioPlayer.play(createAudioResource(next));

    audioPlayer.once(AudioPlayerStatus.Playing, () => {
        console.log('The audio player has started playing!');
    });
    audioPlayer.once(AudioPlayerStatus.Idle, () => {
        // If Song is finished play next song
        console.log("Idle reached");
        song_queue.songs.shift();
        interaction.client.video_player(interaction);
    });
}

//------------Event Handler---------------------

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}


//------------Command Handler---------------------

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

// Log in to Discord with your client's token
client.login(token);

