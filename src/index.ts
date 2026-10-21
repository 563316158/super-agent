import 'dotenv/config';
import { streamText, stepCountIs, type ModelMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createMockModel } from './mock-model';
import { createInterface } from 'node:readline';
import { weatherTool, calculatorTool } from './tools/utility-tools';
import { agentLoop , type BudgetState} from './agent/loop';

const qwen = createOpenAI({
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKey: process.env.DASHSCOPE_API_KEY,
});

const model = !process.env.DASHSCOPE_API_KEY
    ? qwen.chat('qwen-plus-latest')
    : createMockModel();

const tools = { get_weather: weatherTool, calculator: calculatorTool };

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
});

const messages: ModelMessage[] = [];
// 预算由调用方持有，跨轮持续累计——agentLoop 只负责消费它
const budget: BudgetState = { used: 0, limit: 15000 };


const SYSTEM = `你是 Super Agent，一个有工具调用能力的 AI 助手。
需要查询信息时，主动使用工具，不要编造数据。
回答要简洁直接。`;

function ask() {
    rl.question('\nYou: ', async (input) => {
        const trimmed = input.trim();
        if (!trimmed || trimmed === 'exit') {
            console.log('Bye!');
            rl.close();
            return;
        }

        messages.push({ role: 'user', content: trimmed });

        await agentLoop(model, tools, messages, SYSTEM, budget);

        ask();
    });
}

console.log('Super Agent v0.1 (type "exit" to quit)\n');
ask();
