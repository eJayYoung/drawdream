import { MikroORM } from '@mikro-orm/postgresql';
import { MaterialLibrary } from './src/entities/materials.entity';

async function main() {
  const orm = await MikroORM.init({
    entities: [MaterialLibrary],
    dbName: 'huimeng',
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
  });

  const em = orm.em.fork();
  await em.execute('SELECT 1');
  console.log('DB connected');

  const r = await em.execute(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'material_library'`);
  console.log('material_library:', r);

  await orm.close(true);
}
main().catch(e => { console.error(e.message); process.exit(1); });