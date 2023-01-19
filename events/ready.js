const { Events } = require('discord.js');
const { generateDependencyReport } = require('@discordjs/voice');

const axios = require('axios');
const express = require('express');
const fs = require('fs');
const app = express();

const { sptfClientId, sptfClientScrt } = require('../config.json');

// we need to base64 encode the app credientials for later requests to the Spotify API
const buff = Buffer.from(sptfClientId + ': ' + sptfClientScrt);
const base64data = buff.toString('base64');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		//console.log(generateDependencyReport());
		
		// the login route should redirect the user to the auth page of Spotify,
		// once the auth is complete, it sends the user back to the /callback route (below)
		app.get('/login', function(req, res) {
			const scope = 'user-read-currently-playing';
			const redirect_uri = 'http://localhost:8888/callback';
			const client_id = ''; /* insert client_id you got before from Spotify */
			res.redirect('https://accounts.spotify.com/authorize' +
			'?response_type=code' +
			'&client_id=' + client_id +
			'&scope=' + encodeURIComponent(scope) +
			'&redirect_uri=' + encodeURIComponent(redirect_uri));
		});
		
		app.get('/callback', async function(req, res) {
			// the auth_code will be included in the /callback route request
			// as query parameter "code"
			const auth_code = req.query.code;
		
			// now we use the auth_code to actually get the access_token,
			// and further more the refresh_token
			const options = {
			url : 'https://accounts.spotify.com/api/token',
			method : 'post',
			headers : {
				authorization : `Basic ${base64data}`, /* remember ? */
				contentType : 'application/x-www-form-urlencoded'
			},
			params : {
				grant_type : 'authorization_code',
				code : auth_code
			}
			};
		
			const response = await axios(options);
			const refresh_token = response.data.refresh_token; 
			// Now we have the precious refresh_token, let's store it 
			fs.writeFileSync('./refresh_token.txt', refresh_token);
			return res.end('Success ! You can close this tab now!');
		});
		
		app.listen(8888, () => {
			console.log('App listening on http://localhost:8888');
		});
  
	},
};
