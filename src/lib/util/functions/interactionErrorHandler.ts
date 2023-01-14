import { OwnerMentions } from '#root/config';
import { getWarnError } from '#utils/functions/errorHelpers';
import { ArgumentError, container, Events, UserError, type InteractionHandlerError, type InteractionHandlerParseError } from '@sapphire/framework';
import { codeBlock } from '@sapphire/utilities';
import { bold, DiscordAPIError, hideLinkEmbed, HTTPError, RESTJSONErrorCodes, userMention, type Interaction } from 'discord.js';

const ignoredCodes = [RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.UnknownMessage];

export async function handleInteractionError(error: Error, { handler, interaction }: InteractionHandlerError | InteractionHandlerParseError) {
	// If the error was a string or an UserError, send it to the user:
	if (typeof error === 'string') return stringError(interaction, error);
	if (error instanceof ArgumentError) return argumentError(interaction, error);
	if (error instanceof UserError) return userError(interaction, error);

	const { client, logger } = container;
	// If the error was an AbortError or an Internal Server Error, tell the user to re-try:
	if (error.name === 'AbortError' || error.message === 'Internal Server Error') {
		logger.warn(`${getWarnError(interaction)} (${interaction.user.id}) | ${error.constructor.name}`);
		return alert(interaction, 'I had a small network error when messaging Discord. Please run this command again!');
	}

	// Extract useful information about the DiscordAPIError
	if (error instanceof DiscordAPIError || error instanceof HTTPError) {
		if (ignoredCodes.includes(error.status)) {
			return;
		}

		client.emit(Events.Error, error);
	} else {
		logger.warn(`${getWarnError(interaction)} (${interaction.user.id}) | ${error.constructor.name}`);
	}

	// Emit where the error was emitted
	logger.fatal(`[COMMAND] ${handler.location.full}\n${error.stack || error.message}`);
	try {
		await alert(interaction, generateUnexpectedErrorMessage(error));
	} catch (err) {
		client.emit(Events.Error, err as Error);
	}

	return undefined;
}

function generateUnexpectedErrorMessage(error: Error) {
	return [
		`I found an unexpected error, please report the steps you have taken to ${OwnerMentions}!`,
		'',
		'',
		bold('This is the stacktrace, please send this along with your report:'),
		codeBlock('js', error.stack!)
	].join('\n');
}

function stringError(interaction: Interaction, error: string) {
	return alert(interaction, `Dear ${userMention(interaction.user.id)}, ${error}`);
}

function argumentError(interaction: Interaction, error: ArgumentError<unknown>) {
	return alert(
		interaction,
		error.message ??
			`An error occurred that I was not able to identify. Please try again. If the issue keeps showing up, you can get in touch with the developers by joining my support server through ${hideLinkEmbed(
				'https://discord.gg/sapphiredev'
			)}`
	);
}

function userError(interaction: Interaction, error: UserError) {
	if (Reflect.get(Object(error.context), 'silent')) return;

	return alert(
		interaction,
		error.message ??
			`An error occurred that I was not able to identify. Please try again. If the issue keeps showing up, you can get in touch with the developers by joining my support server through ${hideLinkEmbed(
				'https://discord.gg/sapphiredev'
			)}`
	);
}

function alert(interaction: Interaction, content: string) {
	if (!interaction.isSelectMenu() && !interaction.isButton()) return;

	if (interaction.replied || interaction.deferred) {
		return interaction.editReply({
			content,
			allowedMentions: { users: [interaction.user.id], roles: [] }
		});
	}

	return interaction.reply({
		content,
		allowedMentions: { users: [interaction.user.id], roles: [] },
		ephemeral: true
	});
}
