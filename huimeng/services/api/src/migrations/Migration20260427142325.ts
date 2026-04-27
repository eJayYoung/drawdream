import { Migration } from '@mikro-orm/migrations';

export class Migration20260427142325 extends Migration {

  override up(): void | Promise<void> {
    // character.assets 已存在，跳过
    this.addSql(`alter table "scene" add "weather" varchar(255) null, add "type" varchar(255) null, add "elements" jsonb null;`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "scene" drop column "weather", drop column "type", drop column "elements";`);
  }

}
