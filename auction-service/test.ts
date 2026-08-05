import { prisma } from './src/database';
prisma.refreshToken.findUnique({ where: { id: 'cmsfsfoat0000agvcxouo1mhs' } }).then(r => { console.log(r); process.exit(0); });
