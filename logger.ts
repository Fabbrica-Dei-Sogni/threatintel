import { createLogger, format, transports } from 'winston';
import util from 'util';
import { ConfigDefaults } from './core/utils/ConfigUtils';

export const logger = createLogger({
  level: process.env.LOG_LEVEL || ConfigDefaults.LOG_LEVEL,
  format: format.combine(
    format.label({ label: '[threat-intel]' }),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: (process.env.NODE_ENV || ConfigDefaults.NODE_ENV) === 'production' 
        ? format.json() 
        : format.combine(
            format.label({ label: '[threat-intel]' }),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.colorize(),
            format.printf(({ timestamp, level, message, label }) => {
              return `${timestamp} ${label} ${level}: ${message}`;
            })
          )
    }),
  ],
});

// Helper per formattare gli argomenti come fa console.log originale
const formatArgs = (args: unknown[]) => {
  return util.format(...args);
};

// Sovrascrittura globale dei metodi console per usare Winston
console.log = (...args: unknown[]) => {
  logger.info(formatArgs(args));
};
console.info = (...args: unknown[]) => {
  logger.info(formatArgs(args));
};
console.warn = (...args: unknown[]) => {
  logger.warn(formatArgs(args));
};
console.error = (...args: unknown[]) => {
  logger.error(formatArgs(args));
};
console.debug = (...args: unknown[]) => {
  logger.debug(formatArgs(args));
};

export default logger;
