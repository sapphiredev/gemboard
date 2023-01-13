import { ErrorIdentifiers } from '#utils/constants';
import { getGuildIds } from '#utils/utils';
import { ApplyOptions } from '@sapphire/decorators';
import { Command, UserError } from '@sapphire/framework';
import { isNullish } from '@sapphire/utilities';
import { ApplicationCommandType } from 'discord.js';

@ApplyOptions<Command.Options>({
	preconditions: ['ValidServer', 'ValidChannel']
})
export class SlashCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerContextMenuCommand(
			(builder) =>
				builder //
					.setName('Unstar Message')
					.setType(ApplicationCommandType.Message),

			{ guildIds: getGuildIds() }
		);
	}

	public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		if (interaction.isMessageContextMenuCommand()) {
			const messageToUnStar = BigInt(interaction.targetId);
			const userWhoUnStarred = BigInt(interaction.user.id);

			const userFromDatabase = await this.container.prisma.user.findFirst({ where: { snowflake: userWhoUnStarred } });

			if (isNullish(userFromDatabase)) {
				throw new UserError({
					identifier: ErrorIdentifiers.UserNotFoundInDatabase,
					message: 'Looks like you never starred a message before, how about you star something first?'
				});
			}

			const messageFromDatabase = await this.container.prisma.message.findFirst({ where: { snowflake: messageToUnStar } });

			if (isNullish(messageFromDatabase)) {
				throw new UserError({
					identifier: ErrorIdentifiers.MessageNotFoundInDatabase,
					message: "Looks like that message hasn't been starred yet by anyone, will you be the first?"
				});
			}
		}

		throw new UserError({
			identifier: ErrorIdentifiers.ContextMenuCommandTriggeredOnUserContextMenu,
			message: 'Woaw, you somehow triggered this action from a User context menu, that should not be possible.'
		});
	}
}
