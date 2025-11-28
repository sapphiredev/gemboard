// Config must be the first to be loaded, as it sets the env:
import '#root/config';
import '@sapphire/plugin-logger/register';

import { PrismaClient } from '#lib/generated/prisma-client/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { ApplicationCommandRegistries, container, RegisterBehavior } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { inspect } from 'util';

const adapter = new PrismaPg({
	connectionString: envParseString('DATABASE_URL')
});

const prisma = new PrismaClient({ adapter });

inspect.defaultOptions.depth = 1;
colorette.createColors({ useColor: true });
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);
container.prisma = prisma;

declare module '@sapphire/pieces' {
	interface Container {
		prisma: typeof prisma;
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		ValidServer: never;
		ValidChannel: never;
		ValidCommandChannel: never;
		IsMessageContextMenuCommand: never;
		NoSelfStar: never;
		NoBotStar: never;
	}
}

declare module '@skyra/env-utilities' {
	interface Env {
		CLIENT_ID: string;
		CLIENT_VERSION: string;
		CLIENT_PRESENCE_NAME: string;
		CLIENT_PRESENCE_TYPE: string;

		COMMAND_GUILD_ID: string;

		DISCORD_TOKEN: string;

		DATABASE_URL: string;
	}
}
