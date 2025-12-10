import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdToLogs1765305364210 implements MigrationInterface {
    name = 'AddUserIdToLogs1765305364210'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add user_id column (nullable first to avoid errors with existing data)
        await queryRunner.query(`ALTER TABLE "logs" ADD "user_id" uuid`);

        // 2. Add foreign key constraint
        await queryRunner.query(`ALTER TABLE "logs" ADD CONSTRAINT "FK_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        // Optional: If you want to enforce NOT NULL later, you'd need to backfill data here.
        // For now, we leave it nullable or assume the app handles it. 
        // But ideally it should be NOT NULL. Let's try to make it NOT NULL if the table is empty, 
        // otherwise we might fail if there are existing rows.
        // We'll leave it nullable in DB for safety, but enforce in App.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "logs" DROP CONSTRAINT "FK_logs_user_id"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP COLUMN "user_id"`);
    }
}
