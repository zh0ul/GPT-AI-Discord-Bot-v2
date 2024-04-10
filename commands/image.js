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
		.setName('image')
		.setDescription('Uses DALL-E to generate images')
    .addStringOption(
      option =>
        option.setName('input')
        .setDescription('What you want DALL-E to draw! It can be as simple as a word or as advanced as a paragraph.')
    ),
	execute: execute
};
