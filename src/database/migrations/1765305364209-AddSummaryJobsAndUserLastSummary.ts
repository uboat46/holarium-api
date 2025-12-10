import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSummaryJobsAndUserLastSummary1765305364209 implements MigrationInterface {
    name = 'AddSummaryJobsAndUserLastSummary1765305364209'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add last_summary_at to users
        await queryRunner.query(`ALTER TABLE "users" ADD "last_summary_at" TIMESTAMP WITH TIME ZONE`);

        // Create summary_job_batches table
        await queryRunner.query(`CREATE TYPE "public"."summary_job_batches_status_enum" AS ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "summary_job_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."summary_job_batches_status_enum" NOT NULL DEFAULT 'IN_PROGRESS', "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_summary_job_batches_id" PRIMARY KEY ("id"))`);

        // Create summary_jobs table
        await queryRunner.query(`CREATE TYPE "public"."summary_jobs_status_enum" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "summary_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "batch_id" uuid NOT NULL, "user_id" character varying NOT NULL, "status" "public"."summary_jobs_status_enum" NOT NULL DEFAULT 'PENDING', "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_summary_jobs_id" PRIMARY KEY ("id"))`);

        // Add foreign key
        await queryRunner.query(`ALTER TABLE "summary_jobs" ADD CONSTRAINT "FK_summary_jobs_batch_id" FOREIGN KEY ("batch_id") REFERENCES "summary_job_batches"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "summary_jobs" DROP CONSTRAINT "FK_summary_jobs_batch_id"`);
        await queryRunner.query(`DROP TABLE "summary_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."summary_jobs_status_enum"`);
        await queryRunner.query(`DROP TABLE "summary_job_batches"`);
        await queryRunner.query(`DROP TYPE "public"."summary_job_batches_status_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_summary_at"`);
    }
}
