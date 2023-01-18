const {SlashCommandBuilder, Events } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, AudioPlayerStatus, createAudioResource, getNextResource, createAudioPlayer, NoSubscriberBehavior, PlayerSubscription } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('node:fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('plays a youtube url or searches for a video using keywords')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('youtube url or keywords')
                .setRequired(true)),
	async execute(interaction) {
        // Defer Reply for the case that the bot takes too long
        //await interaction.deferReply();

        // If user not in vc, return
        console.log(interaction.member.voice.channel);
		if(!interaction.member.voice.channel) {
            await interaction.reply({ content: 'You can only use me if you are in a voice channel!', ephemeral: true });
                return;
        }

        // Get server queue from all queues
        const server_queue = interaction.client.queue.get(interaction.guildId);

        let fedUrl = interaction.options.getString('url');
        let song = {};

        // Get a song with url
        if(ytdl.validateURL(fedUrl)){
            const song_info = await ytdl.getInfo(fedUrl);
            song = { title: song_info.videoDetails.title, url: song_info.videoDetails.url };
        }else{ // Get a song using keywords

            // videoFinder function for finding videos with keywords
            const videoFinder = async (query) => {
                const videoResult = await ytSearch(query);
                return (videoResult.videos.length > 1) ? videoResult.videos[0] : null;
            }

            const video = await videoFinder(fedUrl);
            if(video){ // video was found
                song = { title: video.title, url: video.url };
            }else{ // no video found -> show secret error message
                await interaction.reply({ content: 'Error finding video', ephemeral: true });
                return;
            }
        }

        
        if(!server_queue){ // If no server queue exists, create new one and start playing songs
            
            // Queue Data
            const queue_constructor = {
                voice_channel: interaction.member.voice.channel,
                text_channel: interaction.channel,
                connection: null,
                songs: []
            }
            
            // Queue entry in map
            interaction.client.queue.set(interaction.guildId, queue_constructor);
            queue_constructor.songs.push(song);

            try {

                //Establish connection to voice channel         
                const connection =  joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator
                });
                queue_constructor.connection = connection;

                //play video
                video_player(interaction.guild, queue_constructor.songs[0], interaction.client.queue, null);
            } catch (error) { 
                // Player couldnt connect to voice, so kill queue and throw error
                queue.delete(interaction.guildId);
                await interaction.reply({ content: 'Error connecting to voice channel', ephemeral: true });
                return;
            }
        }else{ // server_queue exists
            server_queue.songs.push(song);
        }
        await interaction.reply(`"${song.title}" added to queue.`);
        return;
        
	},
};

const video_player = async (guild, song, queue, audioPlayer) => {
    const song_queue = queue.get(guild.id);
    //console.log(guild.id);
    //console.log(song_queue);
    // If queue does not have any more songs, destroy queue and connection
    if(!song) {
        song_queue.connection.destroy();
        queue.delete(guild.id);
        return;
    }

    // Establish AudioPlayer
    //let subscription;
    if(!audioPlayer){
        audioPlayer = createAudioPlayer();
        song_queue.connection.subscribe(audioPlayer);
    }

    //Get stream using ytdl and play this stream
    const stream = ytdl(song.url, { filter: 'audioonly' });
    let resource = createAudioResource(stream, { inlineVolume: true });
    resource.volume.setVolume(0.5);
    audioPlayer.play(resource);

    audioPlayer.on(AudioPlayerStatus.Playing, () => {
        console.log('The audio player has started playing!');
    });
    audioPlayer.on(AudioPlayerStatus.Idle, () => {
        // If Song is finished play next song
        console.log("Idle reached");
        song_queue.songs.shift();
        video_player(guild, song_queue.songs[0], queue, audioPlayer);
    });
    song_queue.text_channel.send(`Now playing "${song.title}"`)
}