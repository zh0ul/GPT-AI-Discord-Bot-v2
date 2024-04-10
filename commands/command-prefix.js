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
		.setName('command-prefix')
		.setDescription('Changes the prefix for commands. Default is !')
    .addStringOption(
      option =>
        option.setName('new_prefix')
        .setDescription('The new character(s) you want to prefix commands. Default is !')
    ),
	execute: execute
};
