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
    Description: A class for loading environment variables.
    Written by: Nikita Petko
*/

import { LogLevel } from '../logger/log_level';

import environment from '@mfdlabs/environment';

/**
 * A class for loading environment variables from .env files programmatically.
 *
 * @internal This class is only ingested internally.
 */
export default class LoggerEnvironment extends environment {
  private static _instance: LoggerEnvironment;

  /**
   * Represents the singleton instance of the LoggerEnvironment class.
   */
  public static get singleton(): LoggerEnvironment {
    return this._instance ??= new LoggerEnvironment();
  }

  /**
   * This is only ingested by the Logger class.
   *
   * If you set this environment variable, the logger will persist it's log files even if a clearance is requested.
   */
  public get persistLocalLogs(): boolean {
    return super.getOrDefault('PERSIST_LOCAL_LOGS', false);
  }

  /**
   * Used by the logger.
   *
   * If true, then the logger will cut the prefix of the log message in order to read the log message more easily.
   * @note This is advised for use in production.
   */
  public get defaultLoggerCutLogPrefix(): boolean {
    return super.getOrDefault('DEFAULT_LOGGER_CUT_PREFIX', true);
  }

  /**
   * Used by the logger.
   *
   * The default name of the logger.
   */
  public get defaultLoggerName(): string {
    return super.getOrDefault('DEFAULT_LOGGER_NAME', 'singleton-logger');
  }

  /**
   * Used by the logger.
   *
   * If true, we will also log to the file system.
   */
  public get defaultLoggerLogToFileSystem(): boolean {
    return super.getOrDefault('DEFAULT_LOGGER_LOG_TO_FILE_SYSTEM', true);
  }

  /**
   * Used by the logger.
   *
   * If true, we will also log to the console.
   */
  public get defaultLoggerLogToConsole(): boolean {
    return super.getOrDefault('DEFAULT_LOGGER_LOG_TO_CONSOLE', true);
  }

  /**
   * Used by the logger.
   *
   * A loglevel for the logger.
   */
  public get defaultLogLevel(): LogLevel {
    return super.getOrDefault('DEFAULT_LOG_LEVEL', LogLevel.Info); // default to info
  }

  /**
   * Used by the logger.
   *
   * A loglevel for the logger.
   */
  public get defaultLoggerLogWithColor(): boolean {
    return super.getOrDefault('DEFAULT_LOGGER_LOG_WITH_COLOR', true);
  }

  /**
   * Used by the logger.
   *
   * The directory to write log files to.
   */
  public get defaultLogFileDirectory(): string {
    return super.getOrDefault('DEFAULT_LOG_FILE_DIRECTORY', null);
  }
}
