const Command = require('../Command.js');
const { MessageEmbed } = require('discord.js');
const { confirm } = require("djs-reaction-collector")
const { oneLine } = require('common-tags');
const cost = 25;
module.exports = class smashOrPassCommand extends Command {
  constructor(client) {
    super(client, {
      name: 'smashorpass',
      aliases: ['sop', 'smash'],
      usage: 'smashorpass [<user mention/id>]',
      description: oneLine`
        Play a game of smash or pass. You will be shown a random user and you vote smash or pass.
        If there's a match, your discord username is revealed to them.
        
        If a user is mentioned, you will be asked to vote for them.        
        
        Cost: 25 points per smash
      `,
      type: client.types.FUN,
      examples: ['smashorpass', 'sop', 'smash']
    });
  }
  async run(message, args) {
    const SmashRunning = message.client.db.users.selectSmashRunning.pluck().get(message.guild.id, message.author.id)
    if (SmashRunning == 1) return;
    else message.client.db.users.updateSmashRunning.run(1, message.author.id, message.guild.id)
    const prefix = message.client.db.settings.selectPrefix.pluck().get(message.guild.id);
    let points = message.client.db.users.selectPoints.pluck().get(message.author.id, message.guild.id)
    if (points < cost) {
      message.client.db.users.updateSmashRunning.run(0, message.author.id, message.guild.id)
      return (await message.reply(`**You need ${cost - points} more points in this server to play 🔥 Smash or Pass 👎 .**\n\nTo check your points, type \`${prefix}points\``)).delete({timeout: 5000})
    }
    const suggested = message.client.db.matches.getSuggestedUsers.all(message.author.id,message.author.id)
    console.log(suggested);
    if (args[0] == null || args[0] == undefined)
    {
      if (suggested !== undefined && suggested != null)
      {
        for (const mRow of suggested) {
          const mUser = message.client.db.users.selectRowUserOnly(mRow.userID)
          let guild = await message.client.guilds.cache.get(mUser.guild_id)
          let potentialMatchUser = await guild.members.cache.get(mUser.user_id)
          console.log(potentialMatchUser.user.tag)
        }
      }
      let potentialMatchRow = message.client.db.matches.getPotentialMatch.get(message.author.id, message.author.id)
      let potentialMatchUser, guild
      let i = 0;
      do {
        guild = await message.client.guilds.cache.get(potentialMatchRow.guild_id)
        potentialMatchUser = await guild.members.cache.get(potentialMatchRow.user_id)
        i++;
        if (i > 50)
        {
          message.client.db.users.updateSmashRunning.run(0, message.author.id, message.guild.id)
          return message.reply(`Please try again later!`).then(m=>m.delete({timeout: 5000}))
        }
      } while (potentialMatchUser === undefined)
      i = 0;
      let bio = `*${potentialMatchUser.user.username} has not set a bio yet.*`
      if (potentialMatchRow.bio != null) bio = `${potentialMatchUser.user.username}'s Bio:\n${potentialMatchRow.bio}`

      let embed = new MessageEmbed()
          .setTitle(`🔥 Smash or Pass 👎`)
          .setDescription(bio)
          .setImage(potentialMatchUser.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setFooter(`Expires in 10 seconds | Points: ${points}`)

      await message.channel.send(embed).then(async msg=> {

        while (points > cost)
        {
          const d = new Date();
          const reactions = await confirm(msg, message.author, ["🔥", "👎"], 10000);

          if(reactions === '🔥') {
            message.client.db.users.updatePoints.run({ points: -cost }, message.author.id, message.guild.id);
            message.client.db.matches.insertRow.run(message.author.id, potentialMatchUser.user.id, 'yes', d.toISOString())
            points = points - cost
            const matched = message.client.db.matches.getMatch.get(message.author.id, potentialMatchUser.user.id)
            if (matched != null || matched != undefined)
            {
              try{
                await message.author.send(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\nYou matched with ${potentialMatchUser.user.tag}, say hi to them!`).setImage(potentialMatchUser.user.displayAvatarURL({
                  dynamic: true,
                  size: 512
                })).setFooter(`Remember to always be respectful!`))
                await potentialMatchUser.user.send(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\nYou matched with ${message.author.tag}, say hi to them!`).setImage(message.author.displayAvatarURL({
                  dynamic: true,
                  size: 512
                })).setFooter(`Remember to always be respectful!`))
                await msg.edit(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\n${potentialMatchUser.user.username}'s tag has been dmed to you.`).setImage(potentialMatchUser.user.displayAvatarURL({
                  dynamic: true,
                  size: 512
                })))
              }
              catch(err)
              {
                message.client.db.users.updateSmashRunning.run(0, message.author.id, message.guild.id)
                await msg.edit(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\nHowever, we were unable to DM their discord tag to you. Please check your DMs settings.`)).setImage(potentialMatchUser.user.displayAvatarURL({
                  dynamic: true,
                  size: 512
                }))
              }
            }
            await msg.edit(new MessageEmbed().setTitle(`🔥 Smashed ${potentialMatchUser.user.username}`).setDescription(`Loading...`).setFooter(`Expires in 10 seconds | Points: ${points}`))
            potentialMatchUser.user.send(`You just received a 🔥 Smash on **🔥 Smash or Pass 👎**. Play now to see if it's a match`).catch(err => console.log(err))
            if (points < cost)
            {
              message.client.db.users.updateSmashRunning.run(1, message.author.id, message.guild.id)
              break;
            }
          }
          else if(reactions === '👎') {
            message.client.db.matches.insertRow.run(message.author.id, potentialMatchUser.id, 'no', d.toISOString())
            await msg.edit(new MessageEmbed().setTitle(`👎 Passed ${potentialMatchUser.user.username}`).setDescription(`Loading...`).setFooter(`Expires in 10 seconds | Points: ${points}`))
          }
          else {
            message.client.db.users.updateSmashRunning.run(0, message.author.id, message.guild.id)
            await msg.edit(`Stopped playing Smash or Pass!`, {embed: null})
            return;
          }

          await msg.reactions.removeAll();
          potentialMatchRow = message.client.db.matches.getPotentialMatch.get(message.author.id, message.author.id)

          do {
            guild = await message.client.guilds.cache.get(potentialMatchRow.guild_id)
            potentialMatchUser = await guild.members.cache.get(potentialMatchRow.user_id)
            i++;
            if (i > 50)
            {
              message.client.db.users.updateSmashRunning.run(0, message.author.id, message.guild.id)
              return msg.edit(`Please try again later!`, {embed: null}).then(m=>m.delete({timeout: 5000}))
            }
          } while (potentialMatchUser === undefined)
          i = 0;

          bio = `*${potentialMatchUser.user.username} has not set a bio yet.*`
          if (potentialMatchRow.bio != null) bio = `${potentialMatchUser.user.username}'s Bio:\n${potentialMatchRow.bio}`

          embed = new MessageEmbed()
              .setTitle(`🔥 Smash or Pass 👎`)
              .setDescription(bio)
              .setImage(potentialMatchUser.user.displayAvatarURL({ dynamic: true, size: 512 }))
              .setFooter(`Expires in 10 seconds | Points: ${points}`)
          await msg.edit(embed)
        }
        if (points < cost)
        {
          message.client.db.users.updateSmashRunning.run(0, message.author.id, message.guild.id)
          return msg.edit(`**You need ${cost - points} more points in this server to play Smash or Pass .**\n\nTo check your points, type \`${prefix}points\``, {embed: null}).then(m => m.delete({timeout: 10000}))
        }
      })
    }
    // MENTIONED A USER
    else
    {
      const member = await this.getMemberFromMention(message, args[0]) || await message.guild.members.cache.get(args[0] || await message.guild.members.cache.find(m=>m.displayName.toLowerCase().startsWith(args[0].toLowerCase())));
      if (member == undefined) return message.reply(`Failed to find a user with that name, please try mentioning them or use their user ID.`).then(m=>m.delete({timeout:5000}))
      const row = message.client.db.matches.getSeenByUser.get(message.author.id, member.user.id)
      if (row != null || row !== undefined)
      {
        if (row.liked == 'yes')
        {
          const row2 = message.client.db.matches.getMatch.get(message.author.id, member.user.id)
          if (row2 != null || row2 !== undefined) return (await message.reply(`🔥 You two have matched already 🔥. To unmatch, type \`${prefix}unmatch <user mention/id>\``)).then(m=>m.delete({timeout: 10000}))
          return message.reply(`You already voted 🔥 Smash on ${member.user.username}. To reset your Smash or Pass history, type \`${prefix}resetSmashOrPass\``).then(m=>m.delete({timeout: 10000}))
        }
        return message.reply(`You already voted 👎 Pass on ${member.user.username}. To reset your Smash or Pass history, type \`${prefix}resetSmashOrPass\``).then(m=>m.delete({timeout: 10000}))
      }

      let {
        bio: Bio
      } = message.client.db.users.selectBio.get(message.guild.id, member.user.id);

      let bio = `*${member.user.username} has not set a bio yet.*`
      if (Bio != null) bio = `${member.user.username}'s Bio:\n${Bio}`

      let embed = new MessageEmbed()
          .setTitle(`🔥 Smash or Pass 👎`)
          .setDescription(bio)
          .setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
          .setFooter(`Expires in 10 seconds | Points: ${points}`)

      message.channel.send(embed).then(async msg=>{
        const d = new Date();
        const reactions = await confirm(msg, message.author, ["🔥", "👎"], 10000);

        if(reactions === '🔥') {
          message.client.db.users.updatePoints.run({ points: -cost }, message.author.id, message.guild.id);
          message.client.db.matches.insertRow.run(message.author.id, member.user.id, 'yes', d.toISOString())
          points = points - cost
          const matched = message.client.db.matches.getMatch.get(message.author.id, member.user.id)

          if (matched != null || matched != undefined)
          {
            try
            {
              await message.author.send(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\nYou matched with ${member.user.tag}, say hi to them!`).setImage(member.user.displayAvatarURL({
                dynamic: true,
                size: 512
              })).setFooter(`Remember to always be respectful!`))
              await member.user.send(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\nYou matched with ${message.author.tag}, say hi to them!`).setImage(message.author.displayAvatarURL({
                dynamic: true,
                size: 512
              })).setFooter(`Remember to always be respectful!`))
              await msg.edit(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\n${member.user.username}'s tag has been dmed to you.`).setImage(member.user.displayAvatarURL({
                dynamic: true,
                size: 512
              }))).then(m=>m.delete({timeout: 10000}))
            }
            catch (e) {
              console.log(e)
              await msg.edit(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`🔥🔥 **IT'S A MATCH** 🔥🔥\nHowever, we were unable to DM their discord tag to you. Please check your DMs settings.`)).setImage(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                  .then(m=>m.delete({timeout: 10000}))
            }
          }
          await msg.edit(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`You voted 🔥 Smash on ${member.user.username}`).setImage(member.user.displayAvatarURL({
            dynamic: true,
            size: 512
          }))).then(m=>m.delete({timeout: 10000}))
          member.user.send(`You just received a 🔥 Smash on **🔥 Smash or Pass 👎**. Play now to see if it's a match`).catch(err => console.log(err))
        }
        else if(reactions === '👎') {
          message.client.db.matches.insertRow.run(message.author.id, member.user.id, 'no', d.toISOString())
          (await msg.edit(new MessageEmbed().setTitle(`🔥 Smash or Pass 👎`).setDescription(`You voted 👎 Pass on ${member.user.username}`).setImage(member.user.displayAvatarURL({
            dynamic: true,
            size: 512
          })))).then(m=>m.delete({timeout: 10000}))
        }
        else
        {
          message.client.db.users.updateSmashRunning.run(0, message.author.id, message.guild.id)
          await msg.edit(`Stopped playing Smash or Pass!`, {embed: null})
          return;
        }
      })
    }
  }
};
