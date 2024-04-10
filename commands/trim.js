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
		.setName('trim')
		.setDescription('Trims the last chat response to the specified number of lines.')
    .addStringOption(
      option =>
        option.setName('num')
        .setDescription('The number of lines to keep from the previous chat response.')
    ),
	execute: execute
};
