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
    async generateOnboardingQuestions(): Promise<string[]> {
        const systemPrompt = `You are a thoughtful guide helping a user start their journaling journey.
Generate 3 deep, open-ended questions to help them reflect on their current state, values, and goals.
Return ONLY a JSON array of strings.`;

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
                    messages: [{ role: 'system', content: systemPrompt }],
                    stream: false,
                    format: 'json',
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.message.content;
            // Basic parsing, assuming strict JSON return. Robust parsing similar to analyzeLog would be better in prod.
            try {
                const parsed = JSON.parse(content);
                // Handle if it's wrapped in an object key like "questions"
                if (Array.isArray(parsed)) return parsed;
                if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
                // Fallback
                return ["What is on your mind?", "What are you grateful for?", "What do you want to achieve?"];
            } catch (e) {
                this.logger.warn(`Failed to parse onboarding questions: ${content}`);
                return ["What is on your mind?", "What are you grateful for?", "What do you want to achieve?"];
            }

        } catch (error) {
            this.logger.error(`Failed to generate onboarding questions: ${error.message}`);
            return ["What is on your mind?", "What are you grateful for?", "What do you want to achieve?"];
        }
    }

    async generateContextualPrompt(recentLogs: string[], recentAttributes: any[]): Promise<string> {
        const context = recentLogs.length > 0 ? `Recent Logs:\n${recentLogs.join('\n')}` : 'No recent logs.';
        const stats = recentAttributes.length > 0 ? `Current Stats:\n${JSON.stringify(recentAttributes)}` : 'No stats yet.';

        const systemPrompt = `You are an empathic mirror. Your goal is to help the user reflect on their recent life.

**Context (User's Recent Logs):**
${context}

**User Stats:**
${stats}

**Task:**
Ask ONE insightful question to help them reflect today.
**CRITICAL RULE:** If your question is inspired by a specific event in the logs (e.g., a "deployment", "argument", "project"), you MUST explicitly mention that event in the question so the user knows what you are referring to.
*   *Bad:* "Why was it difficult?" (Ambiguous)
*   *Good:* "You mentioned the deployment was difficult; what specifically challenged you?"

Return ONLY the question text.`;

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
                    messages: [{ role: 'system', content: systemPrompt }],
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data.message.content;
        } catch (error) {
            this.logger.error(`Failed to generate contextual prompt: ${error.message}`);
            return "How are you feeling today?";
        }
    }
    async generateFollowUpPrompt(previousQuestion: string, answerContent: string): Promise<string> {
        const systemPrompt = `You are an empathic mirror engaging in a deep conversation with the user.
        
**Previous Interaction:**
You asked: "${previousQuestion}"
User answered: "${answerContent}"

**Task:**
Ask a follow-up question that digs deeper into their answer. Show you understood what they said.
**Rule:** Be conversational but concise.

Return ONLY the question text.`;

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
                    messages: [{ role: 'system', content: systemPrompt }],
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data.message.content;
        } catch (error) {
            this.logger.error(`Failed to generate follow-up prompt: ${error.message}`);
            return "Tell me more about that.";
        }
    }
}
