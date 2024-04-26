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
		.setName('replace')
		.setDescription('Replace the last message in memory with a new message.')
    .addStringOption(
      option =>
        option.setName('message')
        .setDescription('The message to replace the last message with.')
    ),
	execute: execute
};
