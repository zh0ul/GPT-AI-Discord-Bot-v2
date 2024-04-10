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
		.setName('import')
		.setDescription('Imports character cards in png format.')
    .addAttachmentOption(
      option =>
        option.setName('png_file')
        .setDescription('A png file of a character card.')
    ),
    // .addStringOption(
    //   option =>
    //     option.setName('input')
    //     .setDescription('Discord URL like: https://cdn.discordapp.com/attachments/...')
    // ),
	execute: execute
};
