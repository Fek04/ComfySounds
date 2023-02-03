const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

const ytsr = require('ytsr');

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
        const spotifyAlbumPattern = /^.*(https:\/\/open\.spotify\.com\/album)([^#\&\?]*).*/gi;

        let fedUrl = interaction.options.getString('url');

        if(!spotifyPlaylistPattern.test(fedUrl) && !spotifyAlbumPattern.test(fedUrl)){
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
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator
                });
                queue_constructor.connection = connection;

                //play video
                interaction.client.video_player(interaction);
            } catch (error) { 
                // Player couldnt connect to voice, so kill queue and throw error
                interaction.client.queue.delete(interaction.guildId);
                await interaction.editReply('Error connecting to voice channel: ' + error);
                return;
            }
        }else{ // server_queue exists
            server_queue.songs = server_queue.songs.concat(songs);
        }

        await interaction.editReply(`Playlist added to queue.`);
        return;
    }
}