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
		.setName('memory')
		.setDescription('Manage Chat Memory')
    .addStringOption(
      option =>
        option.setName('options')
        .setDescription('blank to see status, true to enable, false to disable, clear to clear')
    ),
	execute: execute
};
