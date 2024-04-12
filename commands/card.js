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
		.setDescription('View/Manage your character cards or start a new chat.'),
    // .addStringOption(
    //   option =>
    //     option.setName('input')
    //     .setDescription('Input is ignored.')
    // ),
	execute: execute
};
