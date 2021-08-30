//entry point
require("discord-banner")();
const config = require('./config.json');
const Client = require('./src/Client.js');
const { Intents } = require('discord.js');
require('./src/utils/prototypes').arrayProto(Array)

global.__basedir = __dirname;

// Client setup
const intents = new Intents();
intents.add(
  'GUILD_PRESENCES',
  'GUILD_MEMBERS',
  'GUILDS',
  'GUILD_VOICE_STATES',
  'GUILD_MESSAGES',
  'GUILD_MESSAGE_REACTIONS'
);
const client = new Client(config, { ws: { intents: intents } });

// Initialize client
function init() {
  client.loadEvents('./src/events');
  client.loadCommands('./src/commands');
  client.loadTopics('./data/geoguessr');
  client.login(client.token);
}

init();

process.on('unhandledRejection', err => {client.logger.error(err); console.log(err);});