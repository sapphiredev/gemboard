import { Precondition } from '@sapphire/framework';
import type { MessageContextMenuCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override contextMenuRun(interaction: MessageContextMenuCommandInteraction) {
		if (interaction.targetMessage.author.id === interaction.user.id) {
			return this.error({
				message: 'You cannot star your own messages.'
			});
		}

		return this.ok();
	}
}
