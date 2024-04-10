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
		.setName('delete')
		.setDescription('Deletes a given number of messages from memory, starting with the most recent.')
    .addStringOption(
      option =>
        option.setName('num')
        .setDescription('The number of messages to remove from memory.')
    ),
	execute: execute
};
