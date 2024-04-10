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
		.setName('activate')
		.setDescription('Activates and deactivates this bot, per channel.'),
    // .addStringOption(
    //   option =>
    //     option.setName('input')
    //     .setDescription('Input is ignored.')
    // ),
	execute: execute
};
