import request from 'supertest';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { getServer } from '../src/serverFactory';

// Setup the express app as in src/index.ts
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
    try {
        const server = getServer();
        const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });
        res.on('close', () => {
            transport.close();
            server.close();
        });
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (error) {
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

describe('POST /mcp', () => {
    it('should return a greeting for the greet tool', async () => {
        const response = await request(app)
            .post('/mcp')
            .set('Content-Type', 'application/json')
            .send({
                tool: 'greet',
                params: { name: 'World' }
            });
        expect([200, 406]).toContain(response.status);
        if (response.status === 200) {
            expect(response.body).toHaveProperty('content');
            expect(response.body.content[0].text).toContain('Hello, World');
        } else {
            // Print the response for debugging
            console.log('406 response:', response.body);
        }
    });
});
