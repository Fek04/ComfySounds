const { hyperlink, hideLinkEmbed, SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');

const fetch = require('isomorphic-unfetch');
const { getPreview } = require('spotify-url-info')(fetch);

const wait = require('node:timers/promises').setTimeout;

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

            if(spotifyPattern.test(fedUrl)){
                try {
                    await getPreview(fedUrl).then(data => fedUrl = data.artist + " - " + data.title);
                } catch (error) {
                    console.log(error);
                }
                await wait(20);
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
                player: undefined,
                hue_value: Math.floor(Math.random() * 360),
                songs: []
            }
            
            // Queue entry in map
            interaction.client.queue.set(interaction.guildId, queue_constructor);
            queue_constructor.songs.push(song);

            try {

                //Establish connection to voice channel         
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator
                });
                queue_constructor.connection = connection;

                await interaction.reply(`"${hyperlink(song.title, hideLinkEmbed(song.url))}" added to queue.`);
                //play video
                interaction.client.video_player(interaction);
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

