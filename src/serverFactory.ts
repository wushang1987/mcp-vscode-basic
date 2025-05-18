import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function getServer() {
    const server = new McpServer({
        name: 'json-response-streamable-http-server',
        version: '1.0.0',
    }, {
        capabilities: {
            logging: {},
        }
    });

    // Register a simple tool that returns a greeting
    server.tool(
        'greet',
        'A simple greeting tool',
        {
            name: z.string().describe('Name to greet'),
        },
        async ({ name }): Promise<CallToolResult> => {

            console.log(name)
            return {
                content: [
                    {
                        type: 'text',
                        text: `Hello, ${name}!`,
                    },
                ],
            };
        }
    );

    // Register a tool that sends multiple greetings with notifications
    server.tool(
        'multi-greet',
        'A tool that sends different greetings with delays between them',
        {
            name: z.string().describe('Name to greet'),
        },
        async ({ name }, { sendNotification }): Promise<CallToolResult> => {
            const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

            await sendNotification({
                method: "notifications/message",
                params: { level: "debug", data: `Starting multi-greet for ${name}` }
            });

            await sleep(1000); // Wait 1 second before first greeting

            await sendNotification({
                method: "notifications/message",
                params: { level: "info", data: `Sending first greeting to ${name}` }
            });

            await sleep(1000); // Wait another second before second greeting

            await sendNotification({
                method: "notifications/message",
                params: { level: "info", data: `Sending second greeting to ${name}` }
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: `Good morning, ${name}!`,
                    }
                ],
            };
        }
    );
    return server;
}
