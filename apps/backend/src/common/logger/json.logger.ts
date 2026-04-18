import { ConsoleLogger, LogLevel } from '@nestjs/common';

/**
 * JSON logger for production; pretty-prints in development.
 * ~20 lines as specified in architecture.md.
 */
export class JsonLogger extends ConsoleLogger {
  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    _timestampDiff: string
  ): string {
    if (process.env['NODE_ENV'] !== 'production') {
      return super.formatMessage(
        logLevel,
        message,
        pidMessage,
        formattedLogLevel,
        contextMessage,
        _timestampDiff
      );
    }
    return (
      JSON.stringify({
        level: logLevel,
        message,
        context: contextMessage.replace(/[[\]]/g, '').trim() || undefined,
        pid: process.pid,
        timestamp: new Date().toISOString(),
      }) + '\n'
    );
  }
}
