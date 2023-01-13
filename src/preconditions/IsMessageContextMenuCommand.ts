import { Precondition } from '@sapphire/framework';
import type { ContextMenuCommandInteraction } from 'discord.js';

export class UserPrecondition extends Precondition {
	public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
		if (interaction.isMessageContextMenuCommand()) {
			return this.ok();
		}

		return this.error({
			message: 'Woaw, you somehow triggered this action from a User context menu, that should not be possible.'
		});
	}
}
