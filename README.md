# ComfySounds

Simple music bot for discord.

## Features
* **/play** - plays a youtube video by either providing a link to the youtube video, keywords for the video, or a spotify link; adds songs to a queue if there is already a song playing
* **/pause** - pauses the playback
* **/unpause** - resumes the playback
* **/skip** - skips to the next element in the queue
* **/displayqueue** - shows the next ~20 songs in the queue
* **/clearqueue** - clears the queue
* **/shuffle** - shuffles the queue
* **/kill** - clears queue and kills connection to voice
* **/remove** - removes song at provided queue position
* **/playlist** - plays a public spotify playlist with the provided playlist link
* **/pomodoro** - establishes a public or private pomodoro timer

## Installation
Node and npm need to be installed (Last tested with node version 20.10.0)
1. clone repo
2. install required node modules with `npm i` (you may need to install `libtool` with `sudo apt install libtool` for linux)
3. provide a `config.json` file in the project root:
```
{
	"token": "YOUR-DISCORD-BOT-TOKEN"
}
```
4. run `node .` or `botstarter.sh` (the shell script restarts the bot automatically if it crashes for some reason)