import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJournalTables1765305364208 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create Logs table
        await queryRunner.query(`
      CREATE TABLE "logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "content" text NOT NULL,
        "embedding" vector,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_logs_id" PRIMARY KEY ("id")
      )
    `);

        // Create Attributes table
        await queryRunner.query(`
      CREATE TABLE "attributes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "name" character varying NOT NULL,
        "value" integer NOT NULL,
        "date" date NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_attributes_id" PRIMARY KEY ("id")
      )
    `);

        // Create Summaries table
        await queryRunner.query(`
      CREATE TYPE "public"."summaries_type_enum" AS ENUM('WEEKLY', 'MONTHLY')
    `);

        await queryRunner.query(`
      CREATE TABLE "summaries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "period" text NOT NULL,
        "type" "public"."summaries_type_enum" NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_summaries_id" PRIMARY KEY ("id")
      )
    `);

        // Add Foreign Keys
        await queryRunner.query(`
      ALTER TABLE "attributes" 
      ADD CONSTRAINT "FK_attributes_userId" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

        await queryRunner.query(`
      ALTER TABLE "summaries" 
      ADD CONSTRAINT "FK_summaries_userId" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "summaries" DROP CONSTRAINT "FK_summaries_userId"`);
        await queryRunner.query(`ALTER TABLE "attributes" DROP CONSTRAINT "FK_attributes_userId"`);
        await queryRunner.query(`DROP TABLE "summaries"`);
        await queryRunner.query(`DROP TYPE "public"."summaries_type_enum"`);
        await queryRunner.query(`DROP TABLE "attributes"`);
        await queryRunner.query(`DROP TABLE "logs"`);
    }
}
