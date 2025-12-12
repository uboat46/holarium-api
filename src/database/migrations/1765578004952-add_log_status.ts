import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLogStatus1765578004952 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TYPE "public"."log_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`
        );
        await queryRunner.query(
            `ALTER TABLE "logs" ADD "status" "public"."log_status_enum" NOT NULL DEFAULT 'pending'`
        );
        // Update existing logs to 'completed' as they were processed synchronously before this change
        await queryRunner.query(
            `UPDATE "logs" SET "status" = 'completed'`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "logs" DROP COLUMN "status"`
        );
        await queryRunner.query(
            `DROP TYPE "public"."log_status_enum"`
        );
    }

}
