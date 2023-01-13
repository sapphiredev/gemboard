import { getGuildIds } from '#utils/utils';
import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommand, Command } from '@sapphire/framework';

@ApplyOptions<ChatInputCommand.Options>({
	preconditions: ['ValidServer', 'ValidChannel'],
	description: 'Gets the leaderboard of users who most starred messages.'
})
export class SlashCommand extends Command {
	public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
		registry.registerChatInputCommand(
			(builder) =>
				builder //
					.setName(this.name)
					.setDescription(this.description),
			{ guildIds: getGuildIds() }
		);
	}

	public override async chatInputRun(interaction: ChatInputCommand.Interaction) {
		await interaction.deferReply();

		return interaction.reply({
			content: 'You just got the leaderboard!',
			ephemeral: true
		});
	}
}
