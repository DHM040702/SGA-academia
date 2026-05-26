import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { configDotenv } from 'dotenv'

configDotenv({ path: path.join(__dirname, '.env') })

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  migrations: {
    seed: 'ts-node --project tsconfig.seed.json prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
