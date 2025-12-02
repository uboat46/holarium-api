import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLockoutFields1763271330406 implements MigrationInterface {
  name = 'AddUserLockoutFields1763271330406';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locked_until"`);
  }
}
