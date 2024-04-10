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
		.setName('card')
		.setDescription('Shows the current character card set for the bot.'),
    // .addStringOption(
    //   option =>
    //     option.setName('input')
    //     .setDescription('Input is ignored.')
    // ),
	execute: execute
};
