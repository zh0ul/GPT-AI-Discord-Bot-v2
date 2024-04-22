const { Interaction, SlashCommandBuilder } = require('discord.js');

/**
 * 
 * @param {Interaction} interaction 
 */
async function execute(interaction)
{
  
  console.log(interaction);
  console.log(interaction.options._hoistedOptions);

}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('chat-first-message-bot')
		.setDescription('If the bot card has a first message defined, it will say it in chat.'),
    // .addStringOption(
    //   option =>
    //     option.setName('message')
    //     .setDescription('The message the bot will say in chat.')
    // ),
	execute: execute
};
