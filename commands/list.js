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
		.setName('list')
		.setDescription('Shows a list of your character cards.')
    .addStringOption(
      option =>
        option.setName('filter')
        .setDescription('Filter the list.')
    ),
	execute: execute
};
