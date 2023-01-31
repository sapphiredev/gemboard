import { Precondition } from '@sapphire/framework';
import type { MessageContextMenuCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override contextMenuRun(interaction: MessageContextMenuCommandInteraction) {
		if (interaction.targetMessage.author.bot) {
			return this.error({
				message: 'You cannot star a bot message.'
			});
		}

		return this.ok();
	}
}
