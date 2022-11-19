/*
   Copyright 2022 Nikita Petko <petko@vmminfra.net>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/*
    File Name: index.ts
    Description: A console and file logger.
    Written by: Nikita Petko
*/

/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable valid-jsdoc */

////////////////////////////////////////////////////////////////////////////////
// Project imports
////////////////////////////////////////////////////////////////////////////////

import dirname from '../dirname';
import environment from '../environment';

////////////////////////////////////////////////////////////////////////////////
// Type imports
////////////////////////////////////////////////////////////////////////////////

import { LogLevel } from './log_level';
import { LogColor } from './log_color';
import {
  nameRegex,
  invalidLogMessage,
  invalidLoggerName,
  invalidLogMessageType,
  invalidConstructorName,
  invalidSetterStringValue,
  setterValueCannotBeEmpty,
  invalidSetterBooleanValue,
  invalidSetterLogLevelType,
  invalidConstructorLogLevel,
  invalidConstructorNameType,
  invalidConstructorNameEmpty,
  thisKeywordIncorrectClosure,
  invalidConstructorLogToConsole,
  invalidConstructorCutLogPrefix,
  invalidConstructorLogLevelType,
  invalidConstructorLogWithColor,
  invalidConstructorCutLogWithColor,
  invalidConstructorLogToFileSystem,
  setterValueCannotBeUndefinedOrNull,
  invalidConstructorLogToConsoleType,
  invalidConstructorCutLogPrefixType,
  invalidConstructorLogToFileSystemType,
} from './logger_constants';

////////////////////////////////////////////////////////////////////////////////
// Type exports
////////////////////////////////////////////////////////////////////////////////

export { LogLevel };

////////////////////////////////////////////////////////////////////////////////
// Built-in imports
////////////////////////////////////////////////////////////////////////////////

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

////////////////////////////////////////////////////////////////////////////////
// Third-party imports
////////////////////////////////////////////////////////////////////////////////

import net from '@mfdlabs/net';

Error.stackTraceLimit = Infinity;

/**
 * A simple logger class that will log to the console and to a file.
 */
export default class Logger {
  //////////////////////////////////////////////////////////////////////////////
  // Private Static Readonly Properties
  //////////////////////////////////////////////////////////////////////////////

  /* Log File Stuff */

  /**
   * @internal This is a private member.
   */
  private static _logFileBaseDirectoryBacking: string = undefined;

  /**
   * @internal This is a private member.
   */
  private static get _logFileBaseDirectory(): string {
    try {
      if (Logger._logFileBaseDirectoryBacking === undefined) {
        /* istanbul ignore next */
        if (environment.singleton.defaultLogFileDirectory === null || environment.singleton.defaultLogFileDirectory === undefined) {
          Logger._logFileBaseDirectoryBacking = path.join(
            path.resolve(dirname.packageDirname, '..', '..', '..'),
            'logs',
          );
        } else {
          Logger._logFileBaseDirectoryBacking = environment.singleton.defaultLogFileDirectory;
        }
      }

      /* istanbul ignore next */
      return Logger._logFileBaseDirectoryBacking;
    } catch (error) {
      return path.resolve('logs');
    }
  }

  /* Log String Stuff */

  /**
   * @internal This is a private member.
   */
  private static readonly _localIp: string = net.getLocalIPv4();
  /**
   * @internal This is a private member.
   */
  private static readonly _hostname: string = os.hostname();
  /**
   * @internal This is a private member.
   */
  private static readonly _processId: string = process.pid.toString(16);
  /**
   * @internal This is a private member.
   */
  private static readonly _platform: string = os.platform();
  /**
   * @internal This is a private member.
   */
  private static readonly _architecture: string = os.arch();
  /**
   * @internal This is a private member.
   */
  private static readonly _nodeVersion: string = process.versions.node;
  /**
   * @internal This is a private member.
   */
  private static readonly _architectureFmt: string = `${Logger._platform}-${Logger._architecture}` as const;

  /**
   * @internal This is a private member.
   */
  private static readonly _loggers: Logger[] = [];

  //////////////////////////////////////////////////////////////////////////////
  // Private Static Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private static _singleton: Logger = null;
  /**
   * @internal This is a private member.
   */
  private static _noopSingletonLogger: Logger = null;

  //////////////////////////////////////////////////////////////////////////////
  // Private Readonly Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private readonly _cutLogPrefix: boolean = false;

  //////////////////////////////////////////////////////////////////////////////
  // Private/Protected Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  protected _name: string = undefined;
  /**
   * @internal This is a private member.
   */
  /**
   * @internal This is a private member.
   */
  private _logLevel: LogLevel = undefined;
  /**
   * @internal This is a private member.
   */
  private _logToConsole = true;
  /**
   * @internal This is a private member.
   */
  private _logToFileSystem = true;
  /**
   * @internal This is a private member.
   */
  private _logWithColor = true;

  /**
   * @internal This is a private member.
   */
  private _lockedFileWriteStream: fs.WriteStream = null;
  /**
   * @internal This is a private member.
   */
  private _fileName: string = undefined;
  /**
   * @internal This is a private member.
   */
  private _fullyQualifiedLogFileName: string = undefined;

  /**
   * @internal This is a private member.
   */
  private _cachedNonColorPrefix: string;
  /**
   * @internal This is a private member.
   */
  private _cachedColorPrefix: string;

  //////////////////////////////////////////////////////////////////////////////
  // Private/Protected Static Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private static _getFileSafeDateNowIsoString(): string {
    return new Date()
      .toISOString()
      .replace(/[^a-z0-9_-]/gi, '')
      .replace(/-/g, '');
  }

  /**
   * @internal This is a private member.
   */
  private static _getDateNowIsoString(): string {
    return new Date().toISOString();
  }

  /**
   * @internal This is a private member.
   */
  private static _getUptime(): string {
    return process.uptime().toFixed(7);
  }

  /**
   * @internal This is a private member.
   */
  protected static _getDefaultColorSection(content: unknown): string {
    return Logger._getColorSection(LogColor.BrightBlack, content);
  }
  /**
   * @internal This is a private member.
   */
  protected static _getColorSection(color: LogColor, content: unknown): string {
    return util.format('[%s%s%s]', color, content, LogColor.Reset);
  }

  /**
   * @internal This is a private member.
   */
  private static _formatStackTrace(stackTrace: string): string {
    // Changes the first line from 'Error: {message}' to '{message}'
    const stackTraceLines = stackTrace.split('\n');
    stackTraceLines[0] = stackTraceLines[0].replace(/^Error: /, '');

    return stackTraceLines.join('\n');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private/Protected Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private _getNonColorLogPrefix(): string {
    if (this._cutLogPrefix) return (this._cachedNonColorPrefix ??= this._getConstructedShortNonColorLogPrefix());

    return (this._cachedNonColorPrefix ??= this._getConstructedLongNonColorLogPrefix());
  }

  /**
   * @internal This is a private member.
   */
  protected _getConstructedShortNonColorLogPrefix(): string {
    return util.format('[%s][%s][%s]', Logger._localIp, Logger._hostname, this._name);
  }

  /**
   * @internal This is a private member.
   */
  protected _getConstructedLongNonColorLogPrefix(): string {
    return util.format(
      '[%s][%s][%s][%s][%s][%s]',
      Logger._processId,
      Logger._architectureFmt,
      Logger._nodeVersion,
      Logger._localIp,
      Logger._hostname,
      this._name,
    );
  }

  /**
   * @internal This is a private member.
   */
  private _getColorPrefix(): string {
    if (this._cutLogPrefix) return (this._cachedColorPrefix ??= this._getConstructedShortLogPrefix());

    return (this._cachedColorPrefix ??= this._getConstructedLongColorLogPrefix());
  }

  /**
   * @internal This is a protected member.
   */
  protected _getConstructedShortLogPrefix(): string {
    return util.format(
      '%s%s%s',
      Logger._getDefaultColorSection(Logger._localIp),
      Logger._getDefaultColorSection(Logger._hostname),
      Logger._getDefaultColorSection(this._name),
    );
  }

  /**
   * @internal This is a protected member.
   */
  protected _getConstructedLongColorLogPrefix(): string {
    return util.format(
      '%s%s%s%s%s%s',
      Logger._getDefaultColorSection(Logger._processId),
      Logger._getDefaultColorSection(Logger._architectureFmt),
      Logger._getDefaultColorSection(Logger._nodeVersion),
      Logger._getDefaultColorSection(Logger._localIp),
      Logger._getDefaultColorSection(Logger._hostname),
      Logger._getDefaultColorSection(this._name),
    );
  }

  /**
   * @internal This is a protected member.
   */
  protected _constructLoggerMessage(logLevel: LogLevel, format: string, ...args: unknown[]): string {
    let formattedMessage = args?.length === 0 ? format : util.format(format, ...args);

    if (logLevel === LogLevel.Trace)
      formattedMessage = util.format('%s', Logger._formatStackTrace(new Error(formattedMessage).stack));

    if (this._cutLogPrefix)
      return util.format(
        '[%s]%s[%s] %s\n',
        Logger._getDateNowIsoString(),
        this._getNonColorLogPrefix(),
        logLevel.toUpperCase(),
        formattedMessage,
      );

    return util.format(
      '[%s][%s]%s[%s] %s\n',
      Logger._getDateNowIsoString(),
      Logger._getUptime(),
      this._getNonColorLogPrefix(),
      logLevel.toUpperCase(),
      formattedMessage,
    );
  }

  /**
   * @internal This is a protected member.
   */
  protected _constructColoredLoggerMessage(
    logLevel: LogLevel,
    color: LogColor,
    format: string,
    ...args: unknown[]
  ): string {
    let formattedMessage = args?.length === 0 ? format : util.format(format, ...args);

    if (logLevel === LogLevel.Trace)
      formattedMessage = util.format('%s', Logger._formatStackTrace(new Error(formattedMessage).stack));

    if (this._cutLogPrefix)
      return util.format(
        '%s%s%s %s%s%s\n',
        Logger._getDefaultColorSection(Logger._getDateNowIsoString()),
        this._getColorPrefix(),
        Logger._getColorSection(color, logLevel.toUpperCase()),
        color,
        formattedMessage,
        LogColor.Reset,
      );

    return util.format(
      '%s%s%s%s %s%s%s\n',
      Logger._getDefaultColorSection(Logger._getDateNowIsoString()),
      Logger._getDefaultColorSection(Logger._getUptime()),
      this._getColorPrefix(),
      Logger._getColorSection(color, logLevel.toUpperCase()),
      color,
      formattedMessage,
      LogColor.Reset,
    );
  }

  /* This method is async so it can be pushed to the task queue and not block the main one */
  /**
   * @internal This is a private member.
   */
  private async _logLocally(logLevel: LogLevel, format: string, ...args: unknown[]): Promise<void> {
    if (!this._logToFileSystem) return;

    if (this._lockedFileWriteStream === undefined || this._lockedFileWriteStream === null) {
      this._createFileName();
      this._createFileStream();
    }

    try {
      this._lockedFileWriteStream?.write(this._constructLoggerMessage(logLevel, format, ...args));
    } catch (ex) {
      this._logToFileSystem = false;
      this._closeFileStream();

      this.warning(
        'Unable to write to file stream due to "%s". Disabling file stream.',
        ex instanceof Error ? ex.message : ex?.toString() ?? '<unkown error>',
      );
    }
  }

  /**
   * @internal This is a private member.
   */
  private async _logConsole(logLevel: LogLevel, color: LogColor, format: string, ...args: unknown[]): Promise<void> {
    if (!this._logToConsole) return;

    const message = this._logWithColor
      ? this._constructColoredLoggerMessage(logLevel, color, format, ...args)
      : this._constructLoggerMessage(logLevel, format, ...args);

    if (logLevel === LogLevel.Error) process.stderr.write(message);
    else process.stdout.write(message);
  }

  /**
   * @internal This is a protected member.
   */
  protected async _log(logLevel: LogLevel, color: LogColor, format: string, ...args: unknown[]) {
    await this._logConsole(logLevel, color, format, ...args);
    await this._logLocally(logLevel, format, ...args);
  }

  /**
   * @internal This is a private member.
   */
  private _checkLogLevel(logLevelToCheck: LogLevel): boolean {
    const values = Object.values(LogLevel);

    const actualLogLevel = values.indexOf(this._logLevel);
    const logLevelToCheckIndex = values.indexOf(logLevelToCheck);

    return actualLogLevel >= logLevelToCheckIndex;
  }

  /**
   * @internal This is a private member.
   */
  /* istanbul ignore next */
  private _onFileStreamError(error: NodeJS.ErrnoException) {
    this._logToFileSystem = false;
    this._closeFileStream();

    if (error === undefined || error === null) {
      this.warning('File system file write stream error callback invoked, but error not actually provided.');
      return;
    }

    switch (error.code) {
      case 'EACCES':
        this.warning('File system file write stream error callback invoked. Permission denied.');
        break;
      case 'EISDIR':
        this.warning('File system file write stream error callback invoked. File is a directory.');
        break;
      case 'EMFILE':
        this.warning('File system file write stream error callback invoked. Too many open files.');
        break;
      case 'ENFILE':
        this.warning('File system file write stream error callback invoked. File table overflow.');
        break;
      case 'ENOENT':
        this.warning('File system file write stream error callback invoked. File not found.');
        break;
      case 'ENOSPC':
        this.warning('File system file write stream error callback invoked. No space left on device.');
        break;
      case 'EPERM':
        this.warning('File system file write stream error callback invoked. Operation not permitted.');
        break;
      case 'EROFS':
        this.warning('File system file write stream error callback invoked. Read-only file system.');
        break;
      default:
        this.warning('File system file write stream error callback invoked. Unknown error.');
        break;
    }
  }

  /**
   * @internal This is a private member.
   */
  private _createFileStream() {
    this._lockedFileWriteStream = fs.createWriteStream(this._fullyQualifiedLogFileName, { flags: 'a' });
    this._lockedFileWriteStream.on('error', this._onFileStreamError.bind(this));
  }

  /**
   * @internal This is a private member.
   */
  private _closeFileStream() {
    this._lockedFileWriteStream?.end();
    this._lockedFileWriteStream?.destroy();
    this._lockedFileWriteStream = undefined;

    this._fullyQualifiedLogFileName = undefined;
    this._fileName = undefined;
  }

  /**
   * @internal This is a private member.
   */
  private _createFileName() {
    this._fileName ??= util.format(
      'log_%s_%s_%s_%s.log',
      this._name,
      process.version,
      Logger._getFileSafeDateNowIsoString(),
      process.pid.toString(16).toUpperCase(),
    );

    this._fullyQualifiedLogFileName ??= path.join(Logger._logFileBaseDirectory, this._fileName);

    if (fs.existsSync(Logger._logFileBaseDirectory)) return;

    try {
      fs.mkdirSync(Logger._logFileBaseDirectory, { recursive: true });
    } catch (error: unknown) {
      this._logToFileSystem = false;
      this._closeFileStream();
      let errorMessage = undefined;

      if (error instanceof Error) {
        const errnoException = error as NodeJS.ErrnoException;

        if (errnoException?.code === 'EPERM' || errnoException?.code === 'EACCES') {
          this.warning(
            'Unable to create log file directory. Please ensure that the current user has permission to create directories.',
          );

          return;
        }

        errorMessage = error.message;
      } else {
        errorMessage = error?.toString() ?? '<unknown error>';
      }

      // eslint-disable-next-line quotes
      this.warning("Unable to create log file directory. An unknown error has occurred '%s'.", errorMessage);
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public Static Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Requests that the log file directory be cleared.
   *
   * @param {boolean} override - If true, the log file directory will be cleared regardless of environment variables.
   * @returns {void} - Nothing.
   */
  public static tryClearLocalLog(override = false): void {
    Logger.singleton.log('Try clear local log files...');

    try {
      if (environment.singleton.persistLocalLogs) {
        if (override) {
          Logger.singleton.warning('Override flag set. Clearing local log files.');
        } else {
          Logger.singleton.warning('Local log files will not be cleared because persistLocalLogs is set to true.');
          return;
        }
      }

      Logger.singleton.log('Clearing local log files...');

      for (const logger of Logger._loggers.filter((logger) => logger._logToFileSystem)) logger._closeFileStream();

      if (fs.existsSync(this._logFileBaseDirectory)) {
        fs.rmSync(this._logFileBaseDirectory, { recursive: true, force: true });
        fs.mkdirSync(this._logFileBaseDirectory);
      }

      for (const logger of Logger._loggers.filter((logger) => logger._logToFileSystem)) {
        logger._createFileName();
        logger._createFileStream();
      }
    } catch (error: unknown) {
      for (const logger of Logger._loggers.filter((logger) => logger._logToFileSystem)) {
        logger._logToFileSystem = false;
        logger._closeFileStream();
      }

      let errorMessage = undefined;

      if (error instanceof Error) {
        const errnoException = error as NodeJS.ErrnoException;

        if (errnoException?.code === 'EPERM' || errnoException?.code === 'EACCES') {
          Logger.singleton.warning(
            'Unable to create log file directory. Please ensure that the current user has permission to create directories.',
          );

          return;
        }

        errorMessage = error.message;
      } else {
        errorMessage = error?.toString() ?? '<unknown error>';
      }

      Logger.singleton.warning(
        // eslint-disable-next-line quotes
        "Unable to create log file directory. An unknown error has occurred '%s'.",
        errorMessage,
      );
    }
  }

  /**
   * Tries to clear out all tracked loggers.
   * @returns {void} - Nothing.
   */
  public static tryClearAllLoggers(): void {
    Logger.singleton.log('Try clear all loggers...');

    try {
      for (const logger of Logger._loggers.filter(
        (logger) => logger._name !== this._singleton?._name && logger._name !== this._noopSingletonLogger?._name,
      )) {
        let index = 0;
        while ((index = Logger._loggers.findIndex((otherLogger) => otherLogger._name === logger._name)) >= 0)
          Logger._loggers.splice(index, 1);

        logger._closeFileStream();
      }
    } catch (error) {
      Logger.singleton.warning('Error clearing all loggers: %s', error);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Constructor
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Creates a new instance of the Logger class.
   * @param {string} name - The name of the logger.
   * @param {LogLevel=} logLevel - The log level of the logger.
   * @param {boolean=} logToFileSystem - If true, the logger will log to the file system.
   * @param {boolean=} logToConsole - If true, the logger will log to the console.
   * @param {boolean=} cutLogPrefix - If true, the logger will cut the log prefix.
   * @param {boolean=} logWithColor - If true, the logger will console log with colors.
   * @note If you do not require a specific logger, use logger.singleton instead.
   */
  public constructor(
    name: string,
    logLevel: LogLevel = LogLevel.Info,
    logToFileSystem: boolean = true,
    logToConsole: boolean = true,
    cutLogPrefix: boolean = true,
    logWithColor: boolean = true,
  ) {
    if (name === undefined || name === null) throw new ReferenceError(invalidConstructorName);
    if (typeof name !== 'string') throw new TypeError(invalidConstructorNameType);
    if (name.length === 0) throw new RangeError(invalidConstructorNameEmpty);
    if (!nameRegex.test(name)) throw new SyntaxError(invalidLoggerName);
    if (Logger._loggers.findIndex((logger) => logger._name === name) !== -1)
      throw new ReferenceError(`Logger with name '${name}' already exists.`);

    if (logLevel === undefined || logLevel === null) throw new ReferenceError(invalidConstructorLogLevel);
    if (typeof logLevel !== 'string') throw new TypeError(invalidConstructorLogLevelType);
    logLevel = logLevel?.toLowerCase() as LogLevel;
    if (Object.values(LogLevel).indexOf(logLevel) === -1)
      throw new TypeError(
        `Invalid log level: ${logLevel}. Valid log levels are: ${Object.values(LogLevel).join(', ')}`,
      );

    if (logToFileSystem === undefined || logToFileSystem === null)
      throw new ReferenceError(invalidConstructorLogToFileSystem);
    if (typeof logToFileSystem !== 'boolean') throw new TypeError(invalidConstructorLogToFileSystemType);

    if (logToConsole === undefined || logToConsole === null) throw new ReferenceError(invalidConstructorLogToConsole);
    if (typeof logToConsole !== 'boolean') throw new TypeError(invalidConstructorLogToConsoleType);

    if (cutLogPrefix === undefined || cutLogPrefix === null) throw new ReferenceError(invalidConstructorCutLogPrefix);
    if (typeof cutLogPrefix !== 'boolean') throw new TypeError(invalidConstructorCutLogPrefixType);

    if (logWithColor === undefined || logWithColor === null) throw new ReferenceError(invalidConstructorLogWithColor);
    if (typeof logWithColor !== 'boolean') throw new TypeError(invalidConstructorCutLogWithColor);

    Logger._loggers.push(this);

    this._name = name;
    this._logLevel = logLevel;
    this._logToFileSystem = logToFileSystem;
    this._logToConsole = logToConsole;
    this._cutLogPrefix = cutLogPrefix;
    this._logWithColor = logWithColor;

    // Check if there's a there's actually a terminal to log to
    this._logToConsole = this._logToConsole && process.stdout.isTTY && process.stderr.isTTY;

    if (this._logToConsole === undefined) {
      this._logToConsole = true;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Static Getters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Gets a singleton instance of the Logger class.
   * @returns {Logger} - The singleton instance of the Logger class.
   * @note This is the recommended way to get a logger if you do not require a specific logger.
   */
  public static get singleton(): Logger {
    return (Logger._singleton ??= new Logger(
      environment.singleton.defaultLoggerName,
      environment.singleton.defaultLogLevel,
      environment.singleton.defaultLoggerLogToFileSystem,
      environment.singleton.defaultLoggerLogToConsole,
      environment.singleton.defaultLoggerCutLogPrefix,
      environment.singleton.defaultLoggerLogWithColor,
    ));
  }

  /**
   * Gets a singleton instance of the Logger class that noops all logging.
   * @returns {Logger} - The singleton instance of the Logger class.
   * @note This is the recommended way to get a logger if you do not require a specific logger.
   */
  public static get noopSingleton(): Logger {
    return (Logger._noopSingletonLogger ??= new Logger(
      environment.singleton.defaultLoggerName + '_noop',
      LogLevel.None,
      false,
      false,
      false,
      false,
    ));
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Getters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Gets the name of the logger.
   * @returns {string} - The name of the logger.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Gets the log level of the logger.
   * @returns {LogLevel} - The log level of the logger.
   * @note The log level is one of the following: none, error, warning, info, debug, trace.
   */
  public get logLevel(): LogLevel {
    return this._logLevel;
  }

  /**
   * Gets the value that determines if this logger will log to the file system.
   * @returns {boolean} - The value that determines if this logger will log to the file system.
   */
  public get logToFileSystem(): boolean {
    return this._logToFileSystem;
  }

  /**
   * Gets the value that determines if this logger will log to the console.
   * @returns {boolean} - The value that determines if this logger will log to the console.
   */
  public get logToConsole(): boolean {
    return this._logToConsole;
  }

  /**
   * Gets the value that determines if this logger will cut the log prefix.
   * @returns {boolean} - The value that determines if this logger will cut the log prefix.
   */
  public get cutLogPrefix(): boolean {
    return this._cutLogPrefix;
  }

  /**
   *Gets the value that determines if this logger will log with color.
   * @returns {boolean} - The value that determines if this logger will log with color.
   */
  public get logWithColor(): boolean {
    return this._logWithColor;
  }

  /**
   * Gets the log file name.
   * @returns {string} - The log file name.
   * @note This is only useful if {@link logToFileSystem} is true.
   */
  public get fileName(): string {
    return this._fileName;
  }

  /**
   * Gets the fully qualified log file name.
   * @returns {string} - The fully qualified log file name.
   * @note This is only useful if {@link logToFileSystem} is true.
   */
  public get fullyQualifiedLogFileName(): string {
    return this._fullyQualifiedLogFileName;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Setters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Sets the name of the logger.
   * @param {string} value - The name of the logger.
   */
  public set name(value: string) {
    if (value === undefined || value === null) throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    if (typeof value !== 'string') throw new TypeError(invalidSetterStringValue);
    if (value.length === 0) throw new RangeError(setterValueCannotBeEmpty);
    if (!nameRegex.test(value)) throw new SyntaxError(invalidLoggerName);
    if (Logger._loggers.findIndex((logger) => logger._name === value) !== -1)
      throw new ReferenceError(`Logger with name '${value}' already exists.`);

    this._name = value;
  }

  /**
   * Sets the log level of the logger.
   * @param {LogLevel} value - The log level of the logger.
   * @note The log level is one of the following: none, error, warning, info, debug, trace.
   */
  public set logLevel(value: LogLevel) {
    if (value === undefined || value === null) throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    if (typeof value !== 'string') throw new TypeError(invalidSetterLogLevelType);
    value = value?.toLowerCase() as LogLevel;
    if (Object.values(LogLevel).indexOf(value) === -1)
      throw new TypeError(`Invalid log level: ${value}. Valid log levels are: ${Object.values(LogLevel).join(', ')}`);

    this._logLevel = value;
  }

  /**
   * Sets the value that determines if this logger will log to the file system.
   * @param {boolean} value - The value that determines if this logger will log to the file system.
   */
  public set logToFileSystem(value: boolean) {
    if (value === undefined || value === null) throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    if (typeof value !== 'boolean') throw new TypeError(invalidSetterBooleanValue);

    if (this._logToFileSystem === value) return;

    this._logToFileSystem = value;

    if (value) {
      this._createFileName();
      this._createFileStream();
    } else {
      this._closeFileStream();
    }
  }

  /**
   * Sets the value that determines if this logger will log to the console.
   * @param {boolean} value - The value that determines if this logger will log to the console.
   */
  public set logToConsole(value: boolean) {
    if (value === undefined || value === null) throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    if (typeof value !== 'boolean') throw new TypeError(invalidSetterBooleanValue);

    this._logToConsole = value;
  }

  /**
   * Sets the value that determines if this logger will log with color.
   * @param {boolean} value - The value that determines if this logger will log with color.
   */
  public set logWithColor(value: boolean) {
    if (value === undefined || value === null) throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    if (typeof value !== 'boolean') throw new TypeError(invalidSetterBooleanValue);

    this._logWithColor = value;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Log Methods
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Logs a regular message.
   * @param {string} message - The message to log.
   * @param {unknown[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   */
  public async log(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) throw new TypeError(thisKeywordIncorrectClosure);
    if (message === undefined || message === null) throw new ReferenceError(invalidLogMessage);
    if (typeof message === 'function') message = message();
    if (typeof message !== 'string') throw new TypeError(invalidLogMessageType);
    if (message.length === 0) throw new RangeError(invalidLogMessage);

    if (!this._checkLogLevel(LogLevel.Info)) return;

    await this._log(LogLevel.Info, LogColor.BrightWhite, message, ...args);
  }

  /**
   * Logs a warning message.
   * @param {string} message - The message to log.
   * @param {unknown[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   */
  public async warning(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) throw new TypeError(thisKeywordIncorrectClosure);
    if (message === undefined || message === null) throw new ReferenceError(invalidLogMessage);
    if (typeof message === 'function') message = message();
    if (typeof message !== 'string') throw new TypeError(invalidLogMessageType);
    if (message.length === 0) throw new RangeError(invalidLogMessage);

    if (!this._checkLogLevel(LogLevel.Warning)) return;

    await this._log(LogLevel.Warning, LogColor.BrightYellow, message, ...args);
  }

  /**
   * Logs a trace message.
   * @param {string} message - The message to log.
   * @param {unknown[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @remarks This will create a trace back directly from this method, not the method that called it.
   */
  public async trace(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) throw new TypeError(thisKeywordIncorrectClosure);
    if (message === undefined || message === null) throw new ReferenceError(invalidLogMessage);
    if (typeof message === 'function') message = message();
    if (typeof message !== 'string') throw new TypeError(invalidLogMessageType);
    if (message.length === 0) throw new RangeError(invalidLogMessage);

    if (!this._checkLogLevel(LogLevel.Trace)) return;

    await this._log(LogLevel.Trace, LogColor.BrightMagenta, message, ...args);
  }

  /**
   * Logs a debug message.
   * @param {string} message - The message to log.
   * @param {unknown[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   */
  public async debug(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) throw new TypeError(thisKeywordIncorrectClosure);
    if (message === undefined || message === null) throw new ReferenceError(invalidLogMessage);
    if (typeof message === 'function') message = message();
    if (typeof message !== 'string') throw new TypeError(invalidLogMessageType);
    if (message.length === 0) throw new RangeError(invalidLogMessage);

    if (!this._checkLogLevel(LogLevel.Debug)) return;

    await this._log(LogLevel.Debug, LogColor.BrightMagenta, message, ...args);
  }

  /**
   * Logs an info message.
   * @param {string} message - The message to log.
   * @param {unknown[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   */
  public async information(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) throw new TypeError(thisKeywordIncorrectClosure);
    if (message === undefined || message === null) throw new ReferenceError(invalidLogMessage);
    if (typeof message === 'function') message = message();
    if (typeof message !== 'string') throw new TypeError(invalidLogMessageType);
    if (message.length === 0) throw new RangeError(invalidLogMessage);

    if (!this._checkLogLevel(LogLevel.Info)) return;

    await this._log(LogLevel.Info, LogColor.BrightBlue, message, ...args);
  }

  /**
   * Logs an error message.
   * @param {string} message - The message to log.
   * @param {unknown[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   */
  public async error(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) throw new TypeError(thisKeywordIncorrectClosure);
    if (message === undefined || message === null) throw new ReferenceError(invalidLogMessage);
    if (typeof message === 'function') message = message();
    if (typeof message !== 'string') throw new TypeError(invalidLogMessageType);
    if (message.length === 0) throw new RangeError(invalidLogMessage);

    if (!this._checkLogLevel(LogLevel.Error)) return;

    await this._log(LogLevel.Error, LogColor.BrightRed, message, ...args);
  }
}
