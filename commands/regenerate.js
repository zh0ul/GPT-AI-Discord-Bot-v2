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
		.setName('regenerate')
		.setDescription('Regenerates the last Chat response.')
    .addStringOption(
      option =>
        option.setName('prompt')
        .setDescription('Additional prompt to temporarily tack onto end of last message.')
    ),
	execute: execute
};
