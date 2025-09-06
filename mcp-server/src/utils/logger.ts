/**
 * Winston logger configuration for MCP server
 */

import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Ensure logs directory exists
const logsDir = join(projectRoot, 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Create logger with environment-specific configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'spec-graph-mcp-server',
    version: '1.0.0'
  },
  transports: [
    // Write all logs with importance level of `error` or higher to `error.log`
    new winston.transports.File({ 
      filename: join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all logs to `combined.log`
    new winston.transports.File({ 
      filename: join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let output = `${timestamp} [${level}]: ${message}`;
        
        // Add metadata if present
        const metaKeys = Object.keys(meta);
        if (metaKeys.length > 0) {
          const metaStr = metaKeys
            .filter(key => key !== 'service' && key !== 'version')
            .map(key => `${key}=${JSON.stringify(meta[key])}`)
            .join(' ');
          if (metaStr) {
            output += ` | ${metaStr}`;
          }
        }
        
        return output;
      })
    )
  }));
}

// Create child loggers for specific modules
export const createModuleLogger = (module: string): winston.Logger => {
  return logger.child({ module });
};

export { logger };
export default logger;
