import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
// Create an MCP server with implementation details
const getServer = () => {
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



const app = express();
app.use(express.json());

app.post('/mcp', async (req: Request, res: Response) => {
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.

    try {
        const server = getServer();
        const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on('close', () => {
            console.log('Request closed');
            transport.close();
            server.close();
        });
        await server.connect(transport);
        console.log('Received MCP request:', req.body);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('Error handling MCP request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
    }
});

app.get('/mcp', async (req: Request, res: Response) => {
    console.log('Received GET MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});

app.delete('/mcp', async (req: Request, res: Response) => {
    console.log('Received DELETE MCP request');
    res.writeHead(405).end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
            code: -32000,
            message: "Method not allowed."
        },
        id: null
    }));
});


// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`MCP Stateless Streamable HTTP Server listening on port ${PORT}`);
});
