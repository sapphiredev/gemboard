import { generateUnexpectedErrorMessage, ignoredCodes } from '#utils/functions/errorHelpers';
import { resolveOnErrorCodes } from '#utils/functions/helpers';
import { Events, Listener, ListenerErrorPayload, Piece, UserError } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { DiscordAPIError, HTTPError, RESTJSONErrorCodes } from 'discord.js';

export class ListenerError extends Listener<typeof Events.ListenerError> {
	private modBotCommandsChannel = process.env.NODE_ENV === 'development' ? '902281783196921857' : '868830230503100426';

	public async run(error: Error, { piece }: ListenerErrorPayload) {
		if (typeof error === 'string') return this.stringError(error);
		if (error instanceof UserError) return this.userError(error);

		const { client, logger } = this.container;
		// If the error was an AbortError or an Internal Server Error, tell the user to re-try:
		if (error.name === 'AbortError' || error.message === 'Internal Server Error') {
			logger.warn(this.getWarnError(error, piece));
			return this.alert('I had a small network error when messaging Discord. Please run this command again!');
		}

		// Extract useful information about the DiscordAPIError
		if (error instanceof DiscordAPIError || error instanceof HTTPError) {
			if (ignoredCodes.includes(error.status)) {
				return;
			}

			client.emit(Events.Error, error);
		} else {
			logger.warn(this.getWarnError(error, piece));
		}

		// Emit where the error was emitted
		logger.fatal(`[LISTENER] ${piece.location.full}\n${error.stack || error.message}`);
		try {
			await this.alert(generateUnexpectedErrorMessage(error));
		} catch (err) {
			client.emit(Events.Error, err as Error);
		}

		return undefined;
	}

	private stringError(error: string) {
		return this.alert(error);
	}

	private userError(error: UserError) {
		if (Reflect.get(Object(error.context), 'silent')) return;

		return this.alert(
			error.message || `An error occurred that I was not able to identify during a listener. Check the console for more details.`
		);
	}

	private async alert(content: string) {
		const targetGuild = await resolveOnErrorCodes(
			this.container.client.guilds.fetch(envParseString('COMMAND_GUILD_ID')),
			RESTJSONErrorCodes.UnknownGuild,
			RESTJSONErrorCodes.InvalidGuild
		);

		if (!targetGuild) return;

		const modBotCommandsChannel = await resolveOnErrorCodes(
			targetGuild.channels.fetch(this.modBotCommandsChannel),
			RESTJSONErrorCodes.UnknownChannel
		);

		if (!modBotCommandsChannel || !modBotCommandsChannel.isTextBased()) return;

		return modBotCommandsChannel.send(content);
	}

	private getWarnError(error: Error, piece: Piece) {
		return `${piece.name} (${piece.location.full}) | ${error.constructor.name}`;
	}
}
