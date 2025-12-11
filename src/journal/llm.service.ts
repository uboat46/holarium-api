import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GcpAuthService } from '../common/gcp-auth.service';

export interface AnalysisResult {
    sentiment: 'Positive' | 'Neutral' | 'Negative';
    entities: string[];
    attributes: {
        name: 'Willpower' | 'Focus' | 'Social' | 'Vitality';
        value: number;
    }[];
}

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);
    private readonly ollamaHost: string;
    private readonly chatModel: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly gcpAuthService: GcpAuthService,
    ) {
        this.ollamaHost = this.configService.get<string>(
            'OLLAMA_HOST',
            'http://ollama:8080',
        );
        this.chatModel = this.configService.get<string>(
            'CHAT_MODEL',
            'gemma3:4b',
        );
    }

    async analyzeLog(content: string, context: string[] = [], summaries: string[] = []): Promise<AnalysisResult> {
        const contextString = context.length > 0
            ? `\n**Context (Similar Past Entries)**:\n${context.join('\n---\n')}\n`
            : '';

        const summaryString = summaries.length > 0
            ? `\n**Recent Weekly Summaries**:\n${summaries.join('\n---\n')}\n`
            : '';

        const systemPrompt = `You are the engine of 'Project Echo', a cognitive mirroring system. Your goal is to build a dynamic 'User Persona'—a gamified character sheet that reflects who the user *actually* is based on their actions, not just who they claim to be.

**The Mission**:
Analyze the user's daily log to uncover hidden behavioral patterns, emotional undertones, and habits. You are not just summarizing; you are quantifying their life into RPG-style attributes to help them level up.
${summaryString}
${contextString}
**The Attributes**:
- **Willpower**: Discipline, resisting temptation, doing hard things.
- **Focus**: Deep work, concentration, clarity of thought.
- **Social**: Connection, empathy, interactions (positive or negative).
- **Vitality**: Physical health, energy, sleep, exercise.

**Task**: Extract JSON with \`sentiment\` (Positive/Neutral/Negative), \`entities\` (array of strings), and \`attributes\` (array of objects with name and value).
If context is provided, use it to identify recurring patterns or changes in behavior.

**Rules**:
- \`value\` is integer -5 (major drain) to +5 (major gain).
- Be objective and strict.
- Return ONLY raw JSON.

**Example 1**:
Input: "Crushed the presentation today! But I'm exhausted and skipped the gym."
Output:
{
  "sentiment": "Positive",
  "entities": ["presentation", "gym"],
  "attributes": [
    { "name": "Focus", "value": 5 },
    { "name": "Vitality", "value": -3 },
    { "name": "Willpower", "value": -2 }
  ]
}

**Example 2**:
Input: "Stayed home, played video games all day. Felt lonely."
Output:
{
  "sentiment": "Negative",
  "entities": ["video games", "home"],
  "attributes": [
    { "name": "Social", "value": -4 },
    { "name": "Vitality", "value": 1 }
  ]
}`;

        try {
            const token = await this.gcpAuthService.getIdToken(this.ollamaHost);
            const headers: any = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.ollamaHost}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.chatModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content },
                    ],
                    stream: false,
                    format: 'json',
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            let llmContent = data.message.content;

            // Strip markdown code blocks if present
            const jsonMatch = llmContent.match(/```json\n([\s\S]*?)\n```/) || llmContent.match(/```([\s\S]*?)```/);
            if (jsonMatch) {
                llmContent = jsonMatch[1];
            }

            try {
                const result = JSON.parse(llmContent);
                return result;
            } catch (parseError) {
                this.logger.error(`Failed to parse LLM response: ${llmContent}`);
                throw new Error('Invalid JSON response from LLM');
            }
        } catch (error) {
            this.logger.error(`Failed to analyze log: ${error.message}`);
            // Return a safe default or rethrow depending on requirements.
            // For now, rethrowing to ensure we know if analysis fails.
            throw error;
        }
    }

    async generateSummary(content: string): Promise<string> {
        const systemPrompt = `You are an expert summarizer for 'Project Echo'.
Your goal is to create a concise but insightful weekly summary of the user's journal entries.
Focus on:
1. Key events and accomplishments.
2. Emotional trends (e.g., "You started the week anxious but found flow by Wednesday").
3. Recurring themes.

Return ONLY the summary text.`;

        try {
            const token = await this.gcpAuthService.getIdToken(this.ollamaHost);
            const headers: any = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.ollamaHost}/api/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: this.chatModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content },
                    ],
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data.message.content;
        } catch (error) {
            this.logger.error(`Failed to generate summary: ${error.message}`);
            throw error;
        }
    }
}
