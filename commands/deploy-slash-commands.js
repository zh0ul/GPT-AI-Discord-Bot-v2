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
		.setName('deploy-slash-commands')
		.setDescription('Deploys slash commands for this bot to the server it is executed on.'),
    // .addStringOption(
    //   option =>
    //     option.setName('input')
    //     .setDescription('Input is ignored.')
    // ),
	execute: execute
};
