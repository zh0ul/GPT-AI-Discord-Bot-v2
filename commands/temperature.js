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
		.setName('temperature')
		.setDescription('Shows and Sets Chat Temperature')
    .addStringOption(
      option =>
        option.setName('temperature')
        .setDescription('A value between 0.0 to 2.0')
    ),
	execute: execute
};
