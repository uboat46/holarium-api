import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableVector1765305364207 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // We generally don't want to drop the extension in down migrations
        // as other tables might depend on it, but for completeness:
        // await queryRunner.query(`DROP EXTENSION IF EXISTS vector;`);
    }
}
