import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1763270427460 implements MigrationInterface {
  name = 'CreateAuthTables1763270427460';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM ('pending', 'active', 'suspended', 'banned')`,
    );
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('user', 'admin')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "username" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'pending',
        "role" "users_role_enum" NOT NULL DEFAULT 'user',
        "failed_login_attempts" integer NOT NULL DEFAULT 0,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "last_failed_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_users_failed_attempts_non_negative" CHECK ("failed_login_attempts" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "users_username_unique" ON "users" ("username")`,
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" character varying(255) NOT NULL,
        "token_family_id" uuid NOT NULL,
        "device" character varying(255),
        "ip" character varying(255),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "rotated_from_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_tokens_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_refresh_tokens_rotated_from_id" FOREIGN KEY ("rotated_from_id") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens" ("token_family_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "refresh_tokens_family_idx"`);
    await queryRunner.query(`DROP INDEX "refresh_tokens_user_id_idx"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_rotated_from_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);

    await queryRunner.query(`DROP INDEX "users_username_unique"`);
    await queryRunner.query(`DROP INDEX "users_email_unique"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "users_role_enum"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
  }
}
