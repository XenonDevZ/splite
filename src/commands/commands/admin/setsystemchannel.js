const Command = require('../../Command.js');
const { MessageEmbed } = require('discord.js');
const { success } = require('../../../utils/emojis.json');
const { oneLine, stripIndent } = require('common-tags');

module.exports = class SetSystemChannelCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'setsystemchannel',
      aliases: ['setsc', 'ssc'],
      usage: 'setsystemchannel <channel mention/ID>',
      description: oneLine`
        Sets the system text channel for your server. This is where ${client.name}'s system messages will be sent. 
        Provide no channel to clear the current \`system channel\`. Clearing this setting is **not recommended** 
        as ${client.name} requires a \`system channel\` to notify you about important errors. \n Use \`clearsystemchannel\` to clear the current \`system channel\`
      `,
      type: client.types.ADMIN,
      userPermissions: ['MANAGE_GUILD'],
      examples: ['setsystemchannel #general','clearsystemchannel']
    });
  }
  run(message, args) {
    const systemChannelId = message.client.db.settings.selectSystemChannelId.pluck().get(message.guild.id);
    const oldSystemChannel = message.guild.channels.cache.get(systemChannelId) || '`None`';
    const embed = new MessageEmbed()
      .setTitle('Settings: `System`')
      .setThumbnail(message.guild.iconURL({ dynamic: true }))
      .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
      .setTimestamp()
      .setColor(message.guild.me.displayHexColor);

    // Clear if no args provided
    if (args.length === 0) {
      return message.channel.send({embeds: [embed.addField('Current System Channel', `${oldSystemChannel}`).setDescription(this.description)]});
    }
    embed.setDescription(`The \`system channel\` was successfully updated. ${success}\n Use \`clearsystemchannel\` to clear the current \`system channel\``)
    const systemChannel = this.getChannelFromMention(message, args[0]) || message.guild.channels.cache.get(args[0]);
    if (!systemChannel || (systemChannel.type != 'GUILD_TEXT' && systemChannel.type != 'GUILD_NEWS') || !systemChannel.viewable)
      return this.sendErrorMessage(message, 0, stripIndent`
        Please mention an accessible text or announcement channel or provide a valid text or announcement channel ID
      `);
    message.client.db.settings.updateSystemChannelId.run(systemChannel.id, message.guild.id);
    message.channel.send({embeds: [embed.addField('System Channel', `${oldSystemChannel} ➔ ${systemChannel}`)]});
  }
};
