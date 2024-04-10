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
		.setName('swap')
		.setDescription('Swaps to a new character.')
    .addStringOption(
      option =>
        option.setName('name')
        .setDescription('The name (or part of the name) of the character you want to swap to.')
    ),
	execute: execute
};
