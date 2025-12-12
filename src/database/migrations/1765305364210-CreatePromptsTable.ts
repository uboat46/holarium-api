import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePromptsTable1765305364210 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create PromptType Enum
        await queryRunner.query(`
            CREATE TYPE "public"."prompts_type_enum" AS ENUM('ONBOARDING', 'DAILY', 'CONTEXTUAL')
        `);

        // Create Prompts table
        await queryRunner.query(`
            CREATE TABLE "prompts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "content" text NOT NULL,
                "type" "public"."prompts_type_enum" NOT NULL DEFAULT 'DAILY',
                "is_answered" boolean NOT NULL DEFAULT false,
                "reference_log_id" uuid,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_prompts_id" PRIMARY KEY ("id")
            )
        `);

        // Add Foreign Keys
        await queryRunner.query(`
            ALTER TABLE "prompts" 
            ADD CONSTRAINT "FK_prompts_userId" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_prompts_userId"`);
        await queryRunner.query(`DROP TABLE "prompts"`);
        await queryRunner.query(`DROP TYPE "public"."prompts_type_enum"`);
    }
}
