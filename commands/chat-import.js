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
		.setName('chat-import')
		.setDescription('Used for importing chats that were exported by /chat-export')
    .addAttachmentOption(
      option =>
        option.setName('json_file')
        .setDescription('A JSON file with chat messages')
    ),
    // .addStringOption(
    //   option =>
    //     option.setName('input')
    //     .setDescription('Discord URL like: https://cdn.discordapp.com/attachments/...')
    // ),
	execute: execute
};
