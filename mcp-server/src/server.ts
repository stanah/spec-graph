#!/usr/bin/env node

/**
 * spec-graph MCP Server
 * 
 * Provides mindmap file operations via Model Context Protocol.
 * Supports reading, creating, updating, and searching mindmap files.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { TOOLS } from './types/tools.js';

class MindmapMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'spec-graph-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.info('Received list tools request');
      return {
        tools: Object.values(TOOLS),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Received tool call: ${name}`, { args });

      try {
        switch (name) {
          case 'read_mindmap':
            // TODO: Implement in next step
            return {
              content: [{ type: 'text', text: 'read_mindmap not implemented yet' }],
            };
          
          case 'create_node':
            // TODO: Implement in next step
            return {
              content: [{ type: 'text', text: 'create_node not implemented yet' }],
            };
            
          case 'update_node':
            // TODO: Implement in next step
            return {
              content: [{ type: 'text', text: 'update_node not implemented yet' }],
            };
            
          case 'delete_node':
            // TODO: Implement in next step
            return {
              content: [{ type: 'text', text: 'delete_node not implemented yet' }],
            };
            
          case 'search_nodes':
            // TODO: Implement in next step
            return {
              content: [{ type: 'text', text: 'search_nodes not implemented yet' }],
            };

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private setupErrorHandling(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    
    logger.info('Starting spec-graph MCP server...');
    
    try {
      await this.server.connect(transport);
      logger.info('MCP server connected and ready for requests');
    } catch (error) {
      logger.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}

// Entry point
async function main(): Promise<void> {
  try {
    const server = new MindmapMCPServer();
    await server.run();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

export { MindmapMCPServer };
