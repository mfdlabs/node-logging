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
    Description: A class for loading environment variables from .env files programmatically.
    Written by: Nikita Petko
*/

import typeConverters from './type_converters';
import { LogLevel } from '../logger/log_level';

import * as fs from 'fs';

/**
 * @internal This type should not be consumed by clients.
 */
type DefaultValueGetter<T> = T | (() => T)

/**
 * A class for loading environment variables from .env files programmatically.
 *
 * @internal This class is only ingested internally.
 */
export default class Environment {
  /**
   * @internal This is a private member.
   */
  private static _isDocker?: boolean = undefined;

  /**
   * Tries to get then deserialize the value of the environment variable..
   *
   * @param {string} key The key of the environment variable.
   * @param {DefaultValueGetter<T>} [defaultValue] The default value of the environment variable.
   * @returns {T} The value of the environment variable.
   * @template T The type of the environment variable.
   * @internal This method is only ingested internally. This is a private method.
   * @private This method is a private method of the Environment class.
   * @static
   * @memberof Environment
   */
  private static _getOrDefault<T>(key: string, defaultValue?: DefaultValueGetter<T>): T {
    // If default value is null, undefined or any type that cannot be inferred then throw
    if (defaultValue === null || defaultValue === undefined) {
      throw new Error('The default value must not be null or undefined.');
    }

    const value = process.env[key];

    switch (typeof defaultValue) {
      case 'boolean':
        return typeConverters.toBoolean(value, defaultValue) as unknown as T;
      case 'number':
        return parseInt(value ?? defaultValue?.toString(), 10) as unknown as T;
      case 'function':
        return (value as unknown as T) || defaultValue?.call(null);
      default:
        if (Array.isArray(defaultValue)) {
          return (value?.split(',') as unknown as T) ?? defaultValue;
        }
        if (defaultValue instanceof RegExp) {
          return new RegExp(value ?? defaultValue.source, defaultValue.flags) as unknown as T;
        }
        if (typeof defaultValue === 'object') {
          return JSON.parse(value ?? JSON.stringify(defaultValue)) as unknown as T;
        }

        return (value as unknown as T) || defaultValue;
    }
  }

  /**
   * Determines if the current context has the .dockerenv file.
   * @returns {boolean} True if the current context has the .dockerenv file.
   */
  public static hasDockerEnv(): boolean {
    if (process.platform !== 'linux') return false;

    return fs.existsSync('/.dockerenv');
  }

  /**
   * Determines if the current context has `docker` within it's CGroup.
   * @returns {boolean} True if the current context has `docker` within it's CGroup.
   */
  public static hasDockerCGroup(): boolean {
    if (process.platform !== 'linux') return false;

    try {
      return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
    } catch {
      return false;
    }
  }

  /**
   * Determines if the current context is running under a docker container.
   * @returns {boolean} True if the current context is running under a docker container.
   */
  public static isDocker(): boolean {
    if (process.platform !== 'linux') return false;

    if (this._isDocker === undefined) {
      this._isDocker = this.hasDockerEnv() || this.hasDockerCGroup();
    }

    return this._isDocker;
  }

  /**
   * This is only ingested by the Logger class.
   *
   * If you set this environment variable, the logger will persist it's log files even if a clearance is requested.
   */
  /* istanbul ignore next */
  public static get persistLocalLogs(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('PERSIST_LOCAL_LOGS', false);
  }

  /**
   * Used by the logger.
   *
   * If true, then the logger will cut the prefix of the log message in order to read the log message more easily.
   * @note This is advised for use in production.
   */
  /* istanbul ignore next */
  public static get defaultLoggerCutLogPrefix(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_LOGGER_CUT_PREFIX', false);
  }

  /**
   * Used by the logger.
   *
   * The default name of the logger.
   */
  /* istanbul ignore next */
  public static get defaultLoggerName(): string {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_LOGGER_NAME', 'singleton-logger');
  }

  /**
   * Used by the logger.
   *
   * If true, we will also log to the file system.
   */
  /* istanbul ignore next */
  public static get defaultLoggerLogToFileSystem(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_LOGGER_LOG_TO_FILE_SYSTEM', true);
  }

  /**
   * Used by the logger.
   *
   * If true, we will also log to the console.
   */
  /* istanbul ignore next */
  public static get defaultLoggerLogToConsole(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_LOGGER_LOG_TO_CONSOLE', true);
  }

  /**
   * Used by the logger.
   *
   * A loglevel for the logger.
   */
  /* istanbul ignore next */
  public static get defaultLogLevel(): LogLevel {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_LOG_LEVEL', LogLevel.Info); // default to info
  }

  /**
   * Used by the logger.
   *
   * A loglevel for the logger.
   */
  /* istanbul ignore next */
  public static get defaultLoggerLogWithColor(): boolean {
    /* istanbul ignore next */
    return this._getOrDefault('DEFAULT_LOGGER_LOG_WITH_COLOR', true); // default to info
  }
}
