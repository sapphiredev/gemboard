import { setup } from '@skyra/env-utilities';
import { defineConfig, env } from 'prisma/config';

setup(new URL('src/.env', import.meta.url));

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations'
	},
	datasource: {
		url: env('DATABASE_URL')
	}
});
