import { OwnerMentions } from '#root/config';
import {
	ArgumentError,
	container,
	Events,
	UserError,
	type ChatInputCommandErrorPayload,
	type ContextMenuCommandErrorPayload
} from '@sapphire/framework';
import { codeBlock } from '@sapphire/utilities';
import {
	bold,
	DiscordAPIError,
	hideLinkEmbed,
	HTTPError,
	hyperlink,
	Message,
	RESTJSONErrorCodes,
	userMention,
	type APIMessage,
	type BaseInteraction,
	type CommandInteraction
} from 'discord.js';

export const ignoredCodes = [RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.UnknownMessage];

export async function handleChatInputOrContextMenuCommandError(
	error: Error,
	{ command, interaction }: ChatInputCommandErrorPayload | ContextMenuCommandErrorPayload
) {
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
	logger.fatal(`[COMMAND] ${command.location.full}\n${error.stack || error.message}`);
	try {
		await alert(interaction, generateUnexpectedErrorMessage(error));
	} catch (err) {
		client.emit(Events.Error, err as Error);
	}

	return undefined;
}

export function generateUnexpectedErrorMessage(error: Error) {
	return [
		`I found an unexpected error, please report the steps you have taken to ${OwnerMentions}!`,
		'',
		'',
		bold('This is the stacktrace, please send this along with your report:'),
		codeBlock('js', error.stack!)
	].join('\n');
}

function stringError(interaction: CommandInteraction, error: string) {
	return alert(interaction, `Dear ${userMention(interaction.user.id)}, ${error}`);
}

function argumentError(interaction: CommandInteraction, error: ArgumentError<unknown>) {
	return alert(
		interaction,
		error.message ||
			`An error occurred that I was not able to identify. Please try again. If the issue keeps showing up, you can get in touch with the developers by joining my support server through ${hideLinkEmbed(
				'https://discord.gg/sapphiredev'
			)}`
	);
}

function userError(interaction: CommandInteraction, error: UserError) {
	if (Reflect.get(Object(error.context), 'silent')) return;

	return alert(
		interaction,
		error.message ||
			`An error occurred that I was not able to identify. Please try again. If the issue keeps showing up, you can get in touch with the developers by joining my support server through ${hideLinkEmbed(
				'https://discord.gg/sapphiredev'
			)}`
	);
}

async function alert(interaction: CommandInteraction, content: string) {
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

/**
 * Formats a message url line.
 * @param url The url to format.
 */
export function getLinkLine(message: APIMessage | Message): string {
	if (message instanceof Message) {
		return bold(hyperlink('Jump to Message!', hideLinkEmbed(message.url)));
	}

	return '';
}

/**
 * Formats an error method line.
 * @param error The error to format.
 */
export function getMethodLine(error: DiscordAPIError | HTTPError): string {
	return `**Path**: ${error.method.toUpperCase()}`;
}

/**
 * Formats an error status line.
 * @param error The error to format.
 */
export function getStatusLine(error: DiscordAPIError | HTTPError): string {
	return `**Status**: ${error.status}`;
}

/**
 * Formats an error codeblock.
 * @param error The error to format.
 */
export function getErrorLine(error: Error): string {
	return `**Error**: ${codeBlock('js', error.stack || error.message)}`;
}

export function getWarnError(interaction: BaseInteraction) {
	return `ERROR: /${interaction.guildId}/${interaction.channelId}/${interaction.id}`;
}
