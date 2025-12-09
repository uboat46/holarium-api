import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterRefreshTokenIncreaseLength1765305364206
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "token_hash" TYPE character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "device" TYPE character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "ip" TYPE character varying(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" TYPE character varying(512)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "token_hash" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "device" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "ip" TYPE character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "password" TYPE character varying(255)`,
    );
  }
}
