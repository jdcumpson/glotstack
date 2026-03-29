export enum LogLevel {
  DEBUG = 0,
  LOG = 1,
  INFO = 2,
  WARNING = 3,
  ERROR = 4,
}

const LogName = {
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.LOG]: 'log',
  [LogLevel.INFO]: 'info',
  [LogLevel.WARNING]: 'warning',
  [LogLevel.ERROR]: 'error',
} as const

const LogLevelToFunc: Record<LogLevel, (...args: Parameters<typeof console.info>) => void> = {
  [LogLevel.DEBUG]: console.debug,
  [LogLevel.INFO]: console.info,
  [LogLevel.LOG]: console.log,
  [LogLevel.WARNING]: console.warn,
  [LogLevel.ERROR]: console.error,
} as const

let logLevel: LogLevel = LogLevel.DEBUG

export const setLogLevel = (level: LogLevel) => {
  logLevel = level
}

const makeLoggingFunction =
  (level: LogLevel) =>
  (...args: Parameters<typeof console.info>) => {
    if (level < logLevel) return

    const func = LogLevelToFunc[level]
    func(`[${LogName[level]}][glotstack.ai]`, ...args)
  }


const logger = {
  debug: makeLoggingFunction(LogLevel.DEBUG),
  info: makeLoggingFunction(LogLevel.INFO),
  warn: makeLoggingFunction(LogLevel.WARNING),
  error: makeLoggingFunction(LogLevel.ERROR),
}

export default logger;