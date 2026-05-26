const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

module.exports = {
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  migrations: {
    seed: 'ts-node --project tsconfig.seed.json prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
}
