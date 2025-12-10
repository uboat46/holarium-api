import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VectorService } from '../src/journal/vector.service';
import { DataSource } from 'typeorm';
import { Log } from '../src/journal/entities/log.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const vectorService = app.get(VectorService);
    const dataSource = app.get(DataSource);
    const logRepo = dataSource.getRepository(Log);

    console.log('🚀 Starting Vector Pipeline Test...');

    try {
        // 1. Generate Embedding
        const text = 'Project Echo is a cognitive journaling platform.';
        console.log(`\n📝 Generating embedding for: "${text}"`);
        const embedding = await vectorService.generateEmbedding(text);
        console.log(`✅ Embedding generated! Length: ${embedding.length}`);

        // 2. Insert Log
        console.log('\n💾 Inserting log into database...');
        const log = logRepo.create({
            content: text,
            embedding: embedding,
            metadata: { source: 'test-script' },
        });
        await logRepo.save(log);
        console.log(`✅ Log saved with ID: ${log.id}`);

        // 3. Vector Search
        console.log('\n🔍 Performing similarity search...');
        const results = await logRepo
            .createQueryBuilder('log')
            .orderBy('log.embedding <-> :embedding')
            .setParameters({ embedding: JSON.stringify(embedding) })
            .limit(1)
            .getMany();

        if (results.length > 0 && results[0].id === log.id) {
            console.log(`✅ Found the log! Content: "${results[0].content}"`);
        } else {
            console.error('❌ Could not find the log via vector search.');
        }
    } catch (error) {
        console.error('❌ Test Failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
