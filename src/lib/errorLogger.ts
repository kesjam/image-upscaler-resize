import fs from 'fs/promises';
import path from 'path';

const ERROR_LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'errors.log');

export async function logError(error: any, context: string = '') {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.stack : JSON.stringify(error);
  
  const logEntry = `[${timestamp}] ${context}\n${errorMessage}\n\n`;
  
  try {
    await fs.mkdir(ERROR_LOG_DIR, { recursive: true });
    await fs.appendFile(ERROR_LOG_FILE, logEntry);
  } catch (writeError) {
    console.error('Failed to write error log:', writeError);
  }
} 