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
		.setName('chat-say')
		.setDescription('Forces the bot to say something in chat. If memory is enabled, it also saves the message to memory.')
    .addStringOption(
      option =>
        option.setName('message')
        .setDescription('The message the bot will say in chat.')
    ),
	execute: execute
};
