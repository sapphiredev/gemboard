import { handleChatInputOrContextMenuCommandDenied } from '#utils/functions/deniedHelper';
import { Events, Listener, type ContextMenuCommandDeniedPayload, type UserError } from '@sapphire/framework';

export class ContextMenuCommandDenied extends Listener<typeof Events.ContextMenuCommandDenied> {
	public run(error: UserError, payload: ContextMenuCommandDeniedPayload) {
		return handleChatInputOrContextMenuCommandDenied(error, payload);
	}
}
