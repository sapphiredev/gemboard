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
					.setName('Star Message')
					.setType(ApplicationCommandType.Message),

			{ guildIds: getGuildIds() }
		);
	}

	public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		if (interaction.isMessageContextMenuCommand()) {
			const messageToStar = BigInt(interaction.targetId);
			const userWhoStarred = BigInt(interaction.user.id);

			let userFromDatabase = await this.container.prisma.user.findFirst({ where: { snowflake: userWhoStarred } });

			if (isNullish(userFromDatabase)) {
				userFromDatabase = await this.container.prisma.user.create({ data: { snowflake: userWhoStarred } });
			}

			const messageFromDatabase = await this.container.prisma.message.findFirst({ where: { snowflake: messageToStar } });

			if (messageFromDatabase) {
				await this.container.prisma.userMessage.create({
					data: {
						messageId: messageToStar,
						userId: userWhoStarred
					}
				});
			} else {
				await this.container.prisma.message.create({
					data: {
						snowflake: messageToStar,
						UserMessage: {
							create: {
								userId: userWhoStarred
							}
						}
					}
				});
			}

			return interaction.reply({
				content: 'You just starred a message!',
				ephemeral: true
			});
		}

		throw new UserError({
			identifier: ErrorIdentifiers.ContextMenuCommandTriggeredOnUserContextMenu,
			message: 'Woaw, you somehow triggered this action from a User context menu, that should not be possible.'
		});
	}
}
