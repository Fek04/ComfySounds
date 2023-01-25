const { hyperlink, hideLinkEmbed, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, AudioPlayerStatus, createAudioResource, getNextResource, createAudioPlayer, NoSubscriberBehavior, PlayerSubscription } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const Spotify = require('node-spotify-api');
const spotifyURI = require('spotify-uri');
const { sptfClientId, sptfClientScrt } = require('../config.json');


const spotify = new Spotify({
    id: sptfClientId,
    secret: sptfClientScrt,
});

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('plays a youtube url or searches for a video using keywords')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('youtube url or keywords')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('prio')
                .setDescription('queues a song to the front of the queue')
                .setRequired(false)),
	async execute(interaction) {
        // Defer Reply for the case that the bot takes too long
        //await interaction.deferReply();
        
        // If user not in vc, return
		if(!interaction.member.voice.channel) {
            await interaction.reply({ content: 'You can only use me if you are in a voice channel!', ephemeral: true });
                return;
        }

        // Get server queue from all queues
        const server_queue = interaction.client.queue.get(interaction.guildId);

        let fedUrl = interaction.options.getString('url');
        let song = {};

        const spotifyPattern = /^.*(https:\/\/open\.spotify\.com\/track)([^#\&\?]*).*/gi;

        // Get a song with url
        if(ytdl.validateURL(fedUrl)){
            const song_info = await ytdl.getInfo(fedUrl);
            song = { title: song_info.videoDetails.title, url: fedUrl };
        }else{ // Get a song using keywords or spotify

            if(spotifyPattern.test(fedUrl)){ // If spotify link parse link to "artist - title"
                const spotifyTrackID = spotifyURI.parse(fedUrl).id;
                let spotifyInfo;
                try{
                    spotifyInfo = await spotify.request(`https://api.spotify.com/v1/tracks/${spotifyTrackID}`);
                }catch(error){
                    await interaction.reply({ content: `Error getting spotify track: ${error}`, ephemeral: true });
                    return;
                }
                fedUrl = spotifyInfo.artists[0].name + " - " + spotifyInfo.name;
            }

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

        //console.log(server_queue);
        if(!server_queue){ // If no server queue exists, create new one and start playing songs
            
            // Queue Data
            const queue_constructor = {
                voice_channel: interaction.member.voice.channel,
                text_channel: interaction.channel,
                connection: null,
                player: undefined,
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

                await interaction.reply(`"${hyperlink(song.title, hideLinkEmbed(song.url))}" added to queue.`);
                //play video
                video_player(interaction.guild, queue_constructor.songs[0], interaction.client.queue, interaction);
            } catch (error) { 
                // Player couldnt connect to voice, so kill queue and throw error
                interaction.channel.send('Error connecting to voice channel: ' + error);
                interaction.client.queue.delete(interaction.guildId);
                console.log(error);
                return;
            }
        }else{ // server_queue exists
            if (interaction.options.getBoolean('prio')) {
                server_queue.songs.splice(1,0,song);
            } else {
                server_queue.songs.push(song);
            }
            await interaction.reply(`"${hyperlink(song.title, hideLinkEmbed(song.url))}" added to queue.`);
        }
        return;
        
	},
};

const video_player = (guild, song, queue, interaction) => {
    const song_queue = queue.get(guild.id);
    //console.log(guild.id);
    //console.log(song_queue);
    let audioPlayer = song_queue.player;

    // If queue does not have any more songs, destroy queue and connection
    if(!song) {
        song_queue.connection.destroy();
        song_queue.player = undefined;
        queue.delete(guild.id);
        return;
    }

    // Establish AudioPlayer
    //let subscription;
    if(!audioPlayer){
        audioPlayer = createAudioPlayer();
        song_queue.connection.subscribe(audioPlayer);
        song_queue.player = audioPlayer;
    }

    //Get stream using ytdl and play this stream
    const next = ytdl(song.url, { filter: 'audioonly', highWaterMark: 1<<25, bitrate: 200 }).
    on('info', (info) => {
        let songLength = new Date(info.videoDetails.lengthSeconds * 1000).toISOString().slice(11, 19);

        let songEmbed = new EmbedBuilder()
            .setColor('#fbbbea')
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
        video_player(guild, song_queue.songs[0], queue, interaction);
    });
}