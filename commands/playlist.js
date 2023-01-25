const { hyperlink, hideLinkEmbed, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getVoiceConnection, joinVoiceChannel, AudioPlayerStatus, createAudioResource, getNextResource, createAudioPlayer, NoSubscriberBehavior, PlayerSubscription } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const ytsr = require('ytsr');
const Spotify = require('node-spotify-api');
const spotifyURI = require('spotify-uri');
const { sptfClientId, sptfClientScrt } = require('../config.json');

const fetch = require('isomorphic-unfetch');
const { getTracks } = require('spotify-url-info')(fetch);

const wait = require('node:timers/promises').setTimeout;


module.exports = {
	data: new SlashCommandBuilder()
		.setName('playlist')
		.setDescription('plays a spotify playlist or album')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('spotify playlist url')
                .setRequired(true)),
	async execute(interaction) {
        // If user not in vc, return
		if(!interaction.member.voice.channel) {
            await interaction.reply({ content: 'You can only use me if you are in a voice channel!', ephemeral: true });
            return;
        }

        // Get server queue from all queues
        const server_queue = interaction.client.queue.get(interaction.guildId);

        const spotifyPlaylistPattern = /^.*(https:\/\/open\.spotify\.com\/playlist)([^#\&\?]*).*/gi;
        let fedUrl = interaction.options.getString('url');

        if(!spotifyPlaylistPattern.test(fedUrl)){
            await interaction.reply({ content: 'The provided url is not a valid spotify playlist!', ephemeral: true });
            return;
        }

        // Defer Reply for the case that the bot takes too long
        await interaction.deferReply();

        let playlistTracks;
        try{
            playlistTracks = await getTracks(fedUrl);
        }catch(error){
            console.log(error);
        }

        // videoFinder function for finding videos with keywords
        const videoFinder = async (query) => {
            console.log(query);
            try {
                const videoResult = await ytsr(query, {limit: 1});
                //console.log(videoResult.items[0].title);
                return (videoResult.items.length >= 1) ? videoResult.items[0] : null;
            } catch (error) {
                console.log("AAAAAAAAAAAAa  \n"+error);
                return null;
            }
        }

        const songs = [];
        await playlistTracks.forEach(async song => {
                const video = await videoFinder(song.artist + " - " + song.name);
                if(video){
                    songs.push({ title: video.title, url: video.url });
                }else{
                    console.log("Error finding song: " + song);
                }
        });
        await wait(1000+playlistTracks.length*50);

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
            queue_constructor.songs = queue_constructor.songs.concat(songs);

            try {

                //Establish connection to voice channel         
                const connection =  joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator
                });
                queue_constructor.connection = connection;

                //play video
                video_player(interaction.guild, queue_constructor.songs[0], interaction.client.queue, interaction);
            } catch (error) { 
                // Player couldnt connect to voice, so kill queue and throw error
                interaction.client.queue.delete(interaction.guildId);
                await interaction.editReply('Error connecting to voice channel: ' + error);
                return;
            }
        }else{ // server_queue exists
            //console.log(songs);
            server_queue.songs = server_queue.songs.concat(songs);
            //console.log(server_queue.songs);
        }

        await interaction.editReply(`Playlist added to queue.`);
        return;
    }
}

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