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
    File Name: logger.spec.ts
    Description: Logger Test Specification
    Written by: Nikita Petko
*/

import dirname from '../dirname';
import environment from '../environment';
import logger, { LogLevel } from '../logger';

import * as fs from 'fs';
import * as path from 'path';
import * as events from 'events';

jest.setTimeout(10000);

// Set up packageDirname for testing. It should be this file's directory.
dirname.packageDirname = path.resolve();

jest.mock('fs');
jest.mock('path');

function mock<T>(type: any, method: string, returnValue: T) {
  const mocked = jest.spyOn(type, method);

  if (typeof returnValue === 'function') {
    mocked.mockImplementation(returnValue as any);
  } else {
    mocked.mockReturnValue(returnValue);
  }
}

function endMock(type: any, method: string) {
  type[method].mockRestore();
}

function mockDefine(type: any, property: string, value: any) {
  const attr = {
    ...Object.getOwnPropertyDescriptor(type, property),
    configurable: true,
  };

  if (typeof value === 'function') {
    attr.value = value;
    delete attr.get;
    delete attr.set;
  } else {
    attr.value = value;
  }

  Object.defineProperty(type, property, attr);
}

class CodeError extends Error implements NodeJS.ErrnoException {
  public errno?: number | undefined;
  public code?: string | undefined;
  public path?: string | undefined;
  public syscall?: string | undefined;

  public name = 'ErrnoException';
  public message = '';

  constructor(code?: string | undefined, p?: string | undefined, syscall?: string | undefined) {
    super();

    this.code = code;
    this.path = p;
    this.syscall = syscall;
  }
}

describe('Logger', () => {
  beforeAll(() => {
    process.env.LOG_LEVEL = LogLevel.Trace;

    // Make sure we mock console.log
    // mockReturn(console, 'log', undefined);
    const mockFileStream = {
      _event: new events.EventEmitter(),
      destroy: jest.fn(),
      emit: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
      write: jest.fn(),
    };
    mockFileStream.on.mockImplementation((e, c) => {
      (mockFileStream as any)._event.on(e, c);
    });
    mockFileStream.emit.mockImplementation((e, ...c) => {
      (mockFileStream as any)._event.emit(e, ...c);
    });

    mockFileStream._event.setMaxListeners(Infinity);

    mock(fs, 'createWriteStream', mockFileStream);
  });

  afterEach(() => {
    logger.tryClearAllLoggers();
  });

  describe('_logFileBaseDirectory', () => {
    it('should return the _logFileBaseDirectoryBacking property', () => {
      // tslint:disable-next-line: no-string-literal
      expect(logger['_logFileBaseDirectory']).toBe(logger['_logFileBaseDirectoryBacking']);
    });

    it('should return the value of path.resolve() if path.join() throws an error', () => {
      mock(path, 'join', () => {
        throw new Error('path.join() failed');
      });
      mock(path, 'resolve', 'resolveValue');

      // tslint:disable-next-line: no-string-literal
      expect(logger['_logFileBaseDirectory']).toBe('resolveValue');

      mock(path, 'join', 'joinValue');
      endMock(path, 'resolve');
    });
  });

  describe('constructor', () => {
    it('should throw if the name is not specified', () => {
      expect(() => {
        return new logger(undefined as any);
      }).toThrow();

      expect(() => {
        return new logger(null as any);
      }).toThrow();
    });

    it('should throw if the name is not a string', () => {
      expect(() => {
        return new logger(1 as any);
      }).toThrow();

      expect(() => {
        return new logger([] as any);
      }).toThrow();
    });

    it('should throw if the name is empty', () => {
      expect(() => {
        return new logger('');
      }).toThrow();
    });

    it('should throw if the name does not match /^[a-zA-Z0-9_\\-]{1,100}$/', () => {
      expect(() => {
        return new logger('invalid name');
      }).toThrow();
    });

    it('should throw if the name is longer than 100 characters', () => {
      expect(() => {
        return new logger('a'.repeat(101));
      }).toThrow();
    });

    it('should throw if there is a logger with the same name', () => {
      // tslint:disable-next-line: no-unused-expression
      new logger('logger');

      expect(() => {
        return new logger('logger');
      }).toThrow();
    });

    it('should throw if the logLevel is null', () => {
      expect(() => {
        return new logger('logger', null as any);
      }).toThrow();
    });

    it('should throw if the logLevel is not a string or LogLevel', () => {
      expect(() => {
        return new logger('logger', 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', [] as any);
      }).toThrow();
    });

    it('should throw if the logLevel is not a valid LogLevel', () => {
      expect(() => {
        return new logger('logger', 'invalid log level' as LogLevel);
      }).toThrow();
    });

    it('should throw if the logToFileSystem argument is null', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, null as any);
      }).toThrow();
    });

    it('should throw if the logToFileSystem argument is not a boolean', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', LogLevel.Trace, [] as any);
      }).toThrow();
    });

    it('should throw if the logToConsole argument is null', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, null as any);
      }).toThrow();
    });

    it('should throw if the logToConsole argument is not a boolean', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', LogLevel.Trace, false, [] as any);
      }).toThrow();
    });

    it('should throw if the cutLogPrefix argument is null', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, null as any);
      }).toThrow();
    });

    it('should throw if the cutLogPrefix argument is not a boolean', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, [] as any);
      }).toThrow();
    });

    it('should throw if the logWithColor argument is null', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, true, null as any);
      }).toThrow();
    });

    it('should throw if the logWithColor argument is not a boolean', () => {
      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, true, 1 as any);
      }).toThrow();

      expect(() => {
        return new logger('logger', LogLevel.Trace, false, false, true, [] as any);
      }).toThrow();
    });

    it('should add the logger to the list', () => {
      const log = new logger('logger');

      expect(logger['_loggers'].findIndex((logger) => logger.name === log.name) !== -1).toBe(true);
      expect(logger['_loggers'].findIndex((logger) => logger.name === 'blah logger') === -1).toBe(true);
    });

    it('should make the logger.logToConsole argument false if we cannot write to stdout or stderr', () => {
      mockDefine(process.stdout, 'isTTY', false);
      mockDefine(process.stderr, 'isTTY', false);

      const log = new logger('logger', LogLevel.Trace, false, true, false);

      expect(log.logToConsole).toBe(false);

      mockDefine(process.stdout, 'isTTY', true);
      mockDefine(process.stderr, 'isTTY', true);
    });

    it('should make the logger.logToConsole argument true if isTTY is undefined', () => {
      mockDefine(process.stdout, 'isTTY', undefined);
      mockDefine(process.stderr, 'isTTY', undefined);

      const log = new logger('logger', LogLevel.Trace, false, true, false);

      expect(log.logToConsole).toBe(true);

      mockDefine(process.stdout, 'isTTY', true);
      mockDefine(process.stderr, 'isTTY', true);
    });
  });

  describe('get_singleton', () => {
    it('should return the singleton logger', () => {
      const singletonLogger = logger.singleton;

      expect(singletonLogger).toBeDefined();
      expect(singletonLogger).toBeInstanceOf(logger);
      expect(singletonLogger.name).toBe(environment.singleton.defaultLoggerName);
    });
  });

  describe('get_noopSingleton', () => {
    it('should return the noop singleton logger', () => {
      const noopSingletonLogger = logger.noopSingleton;

      expect(noopSingletonLogger).toBeDefined();
      expect(noopSingletonLogger).toBeInstanceOf(logger);
      expect(noopSingletonLogger.name).toBe(environment.singleton.defaultLoggerName + '_noop');
    });
  });

  describe('get_globalPrefixEntries', () => {
    it('should return the globalPrefixEntries property', () => {
      logger.globalPrefixEntries = [() => 'test'];

      expect(logger.globalPrefixEntries).toBeDefined();
      expect(logger.globalPrefixEntries).toBeInstanceOf(Array);
      expect(logger.globalPrefixEntries.length).toBe(1);
    });
  });

  describe('get_name', () => {
    it('should return the name of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.name).toBe('logger');
    });
  });

  describe('get_logLevel', () => {
    it('should return the log level of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.logLevel).toBe(LogLevel.Trace);
    });
  });

  describe('get_logToFileSystem', () => {
    it('should return the logToFileSystem property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.logToFileSystem).toBe(true);
    });
  });

  describe('get_logToConsole', () => {
    it('should return the logToConsole property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.logToConsole).toBe(true);
    });
  });

  describe('get_cutLogPrefix', () => {
    it('should return the cutLogPrefix property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(log.cutLogPrefix).toBe(false);
    });
  });

  describe('get_logWithColor', () => {
    it('should return the logWithColor property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false, false);

      expect(log.logWithColor).toBe(false);
    });
  });

  describe('get_fileName', () => {
    it('should return the fileName property of the logger if the logToFileSystem property is true', () => {
      mock(fs, 'existsSync', () => {
        return true;
      });
      mock(fs, 'rmSync', () => {
        return true;
      });
      mock(fs, 'mkdirSync', () => {
        return true;
      });

      const log = new logger('logger', LogLevel.Trace, false, true, false);

      log.logToFileSystem = true;

      expect(log.fileName).toBeDefined();

      log.logToFileSystem = false;

      expect(log.fileName).toBeUndefined();

      endMock(fs, 'existsSync');
      endMock(fs, 'rmSync');
      endMock(fs, 'mkdirSync');
    });
  });

  describe('get_fullyQualifiedLogFileName', () => {
    it('should return the fullyQualifiedLogFileName property of the logger if the logToFileSystem property is true', () => {
      mock(fs, 'existsSync', () => {
        return true;
      });
      mock(fs, 'rmSync', () => {
        return true;
      });
      mock(fs, 'mkdirSync', () => {
        return true;
      });

      const log = new logger('logger', LogLevel.Trace, false, true, false);

      log.logToFileSystem = true;

      expect(log.fullyQualifiedLogFileName).toBeDefined();

      log.logToFileSystem = false;

      expect(log.fullyQualifiedLogFileName).toBeUndefined();

      endMock(fs, 'existsSync');
      endMock(fs, 'rmSync');
      endMock(fs, 'mkdirSync');
    });
  });

  describe('get_customPrefixEntries', () => {
    it('should return the customPrefixEntries property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      log.customPrefixEntries = [() => 'test'];

      expect(log.customPrefixEntries).toBeDefined();
      expect(log.customPrefixEntries).toBeInstanceOf(Array);
      expect(log.customPrefixEntries.length).toBe(1);
    });
  });

  describe('set_globalPrefixEntries', () => {
    it('should throw if the value is not undefined or null and is not an array of functions', () => {
      expect(() => {
        logger.globalPrefixEntries = undefined as any;
      }).not.toThrow();

      expect(() => {
        logger.globalPrefixEntries = null as any;
      }).not.toThrow();

      expect(() => {
        logger.globalPrefixEntries = 1 as any;
      }).toThrow();

      expect(() => {
        logger.globalPrefixEntries = ['test'] as any;
      }).toThrow();

      expect(() => {
        logger.globalPrefixEntries = [null] as any;
      }).toThrow();

      logger.globalPrefixEntries = undefined;
    });

    it('should set the globalPrefixEntries property of the logger', () => {
      logger.globalPrefixEntries = [() => 'test'];

      expect(logger.globalPrefixEntries).toBeDefined();
      expect(logger.globalPrefixEntries).toBeInstanceOf(Array);
      expect(logger.globalPrefixEntries.length).toBe(1);

      logger.globalPrefixEntries = undefined;
    });
  });

  describe('set_name', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.name = undefined as any;
      }).toThrow();

      expect(() => {
        log.name = null as any;
      }).toThrow();

      expect(log.name).toBe('logger');
    });

    it('should throw if the type of the value is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.name = true as any;
      }).toThrow();

      expect(() => {
        log.name = 1 as any;
      }).toThrow();

      expect(log.name).toBe('logger');
    });

    it('should throw if the value is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.name = '';
      }).toThrow();

      expect(log.name).toBe('logger');
    });

    it('should throw if the name does not match /^[a-zA-Z0-9_\\-]{1,100}$/', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.name = 'invalid name';
      }).toThrow();

      expect(log.name).toBe('logger');
    });

    it('should throw if the name is longer than 100 characters', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.name = 'a'.repeat(101);
      }).toThrow();

      expect(log.name).toBe('logger');
    });

    it('should throw if there is a logger with the same name', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      new logger('logger2');

      expect(() => {
        log.name = 'logger2';
      }).toThrow();

      expect(log.name).toBe('logger');
    });

    it('should set the name of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.name = 'logger2';

      expect(log.name).toBe('logger2');
    });
  });

  describe('set_logLevel', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logLevel = undefined as any;
      }).toThrow();

      expect(() => {
        log.logLevel = null as any;
      }).toThrow();

      expect(log.logLevel).toBe(LogLevel.Trace);
    });

    it('should throw if the type of the value is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logLevel = true as any;
      }).toThrow();

      expect(() => {
        log.logLevel = 1 as any;
      }).toThrow();

      expect(log.logLevel).toBe(LogLevel.Trace);
    });

    it('should throw if the value is not a valid log level', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logLevel = 'invalid' as any;
      }).toThrow();

      expect(log.logLevel).toBe(LogLevel.Trace);
    });

    it('should set the log level of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logLevel = LogLevel.Info;

      expect(log.logLevel).toBe(LogLevel.Info);
    });
  });

  describe('set_logToFileSystem', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToFileSystem = undefined as any;
      }).toThrow();

      expect(() => {
        log.logToFileSystem = null as any;
      }).toThrow();

      expect(log.logToFileSystem).toBe(true);
    });

    it('should throw if the type of the value is not a boolean', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToFileSystem = 'true' as any;
      }).toThrow();

      expect(() => {
        log.logToFileSystem = 1 as any;
      }).toThrow();

      expect(log.logToFileSystem).toBe(true);
    });

    it('should do nothing if the value is the same', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logToFileSystem = true;

      expect(log.logToFileSystem).toBe(true);
    });

    it('should set the logToFileSystem property of the logger if it is not the same as the current logToFileSystem property', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logToFileSystem = false;

      expect(log.logToFileSystem).toBe(false);
    });

    it('should call logger._closeFileStream if the logToFileSystem property is set to false', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, '_closeFileStream' as any);

      log.logToFileSystem = false;

      expect(log['_closeFileStream']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
    });

    it('should call logger._createFileName and logger._createFileStream if the logToFileSystem property is set to true', () => {
      const log = new logger('logger', LogLevel.Trace, false, true, false);

      jest.spyOn(log, '_createFileName' as any);
      jest.spyOn(log, '_createFileStream' as any);

      log.logToFileSystem = true;

      expect(log['_createFileName']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
      expect(log['_createFileStream']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
    });
  });

  describe('set_logToConsole', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToConsole = undefined as any;
      }).toThrow();

      expect(() => {
        log.logToConsole = null as any;
      }).toThrow();

      expect(log.logToConsole).toBe(true);
    });

    it('should throw if the type of the value is not a boolean', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logToConsole = 'true' as any;
      }).toThrow();

      expect(() => {
        log.logToConsole = 1 as any;
      }).toThrow();

      expect(log.logToConsole).toBe(true);
    });

    it('should set the logToConsole property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logToConsole = false;

      expect(log.logToConsole).toBe(false);
    });
  });

  describe('set_logWithColor', () => {
    it('should throw if the value is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logWithColor = undefined as any;
      }).toThrow();

      expect(() => {
        log.logWithColor = null as any;
      }).toThrow();

      expect(log.logWithColor).toBe(true);
    });

    it('should throw if the type of the value is not a boolean', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.logWithColor = 'true' as any;
      }).toThrow();

      expect(() => {
        log.logWithColor = 1 as any;
      }).toThrow();

      expect(log.logWithColor).toBe(true);
    });

    it('should set the logWithColor property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.logWithColor = false;

      expect(log.logWithColor).toBe(false);
    });
  });

  describe('set_customPrefixEntries', () => {
    it('should throw if the value is not undefined or null and is not an array of functions', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(() => {
        log.customPrefixEntries = undefined as any;
      }).not.toThrow();

      expect(() => {
        log.customPrefixEntries = null as any;
      }).not.toThrow();

      expect(() => {
        log.customPrefixEntries = 1 as any;
      }).toThrow();

      expect(() => {
        log.customPrefixEntries = ['test'] as any;
      }).toThrow();

      expect(() => {
        log.customPrefixEntries = [null] as any;
      }).toThrow();
    });

    it('should set the customPrefixEntries property of the logger', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      log.customPrefixEntries = [() => 'test'];

      expect(log.customPrefixEntries).toBeDefined();
      expect(log.customPrefixEntries).toBeInstanceOf(Array);
      expect(log.customPrefixEntries.length).toBe(1);

      log.customPrefixEntries = undefined;
    });
  });

  describe('tryClearLocalLog', () => {
    it('should call the singleton logger.log method 2 times', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'log');

      logger.tryClearLocalLog();

      expect(singletonLogger.log).toHaveBeenCalledTimes(2);
    });

    it('should call the singleton logger.warning method warning about persistLocalLogs environment variable', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      process.env.PERSIST_LOCAL_LOGS = 'true';

      logger.tryClearLocalLog();

      expect(singletonLogger.warning).toHaveBeenCalledWith(
        'Local log files will not be cleared because persistLocalLogs is set to true.',
      );

      delete process.env.PERSIST_LOCAL_LOGS;
    });

    it('should call the singleton logger.warning method warning about persistLocalLogs environment variable when the override is set', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      process.env.PERSIST_LOCAL_LOGS = 'true';

      logger.tryClearLocalLog(true);

      expect(singletonLogger.warning).toHaveBeenCalledWith('Override flag set. Clearing local log files.');

      delete process.env.PERSIST_LOCAL_LOGS;
    });

    it('should call logger._closeFileStream on each logger present that has _logToFileSystem set', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const nonFileLog = new logger('non-file-logger', LogLevel.Trace, false, true, false);

      log['_logToFileSystem'] = true;

      jest.spyOn(log, '_closeFileStream' as any);
      jest.spyOn(nonFileLog, '_closeFileStream' as any);

      logger.tryClearLocalLog();

      expect(log['_closeFileStream']).toHaveBeenCalled();
      expect(nonFileLog['_closeFileStream']).not.toHaveBeenCalled();
    });

    it('should try to remove the log base directory if it exists', () => {
      mock(fs, 'existsSync', () => {
        return true;
      });
      mock(fs, 'rmSync', () => {
        return true;
      });
      mock(fs, 'mkdirSync', () => {
        return true;
      });

      logger.tryClearLocalLog();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.rmSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should reinstate logger file streams if their logToFileSystem property is true', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const nonFileLog = new logger('non-file-logger', LogLevel.Trace, false, true, false);

      jest.spyOn(log, '_createFileName' as any);
      jest.spyOn(nonFileLog, '_createFileName' as any);
      jest.spyOn(log, '_createFileStream' as any);
      jest.spyOn(nonFileLog, '_createFileStream' as any);

      logger.tryClearLocalLog();

      expect(log['_createFileName']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
      expect(nonFileLog['_createFileName']).not.toHaveBeenCalled(); // tslint:disable-line: no-string-literal
      expect(log['_createFileStream']).toHaveBeenCalled(); // tslint:disable-line: no-string-literal
      expect(nonFileLog['_createFileStream']).not.toHaveBeenCalled(); // tslint:disable-line: no-string-literal
    });

    it('should set the _logToFileSystem property to false and call _closeFileStream in an error is encountered', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const nonFileLog = new logger('non-file-logger', LogLevel.Trace, false, true, false);

      log['_logToFileSystem'] = true;

      jest.spyOn(log, '_closeFileStream' as any);
      jest.spyOn(nonFileLog, '_closeFileStream' as any);

      mock(fs, 'existsSync', () => {
        throw new Error('some error');
      });

      logger.tryClearLocalLog();

      expect(log['_closeFileStream']).toHaveBeenCalled();
      expect(log['_logToFileSystem']).toBe(false);
      expect(nonFileLog['_closeFileStream']).not.toHaveBeenCalled();

      endMock(fs, 'existsSync');
    });

    it('should call the singleton logger.warning method if there was a permission error clearing the directory', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'existsSync', () => {
        throw new CodeError('EPERM');
      });

      logger.tryClearLocalLog();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'existsSync');
    });

    it('should call the singleton logger.warning method if there was a non-code error clearing the log directory', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'existsSync', () => {
        throw new Error('some error');
      });

      logger.tryClearLocalLog();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'existsSync');
    });

    it('should call the singleton logger.warning method if there was a non-error type error clearing the log directory', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'existsSync', () => {
        throw 'non-error-type';
      });

      logger.tryClearLocalLog();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'existsSync');
    });

    it('should call the singleton logger.warning method if there was an unknown error clearing the log directory', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'existsSync', () => {
        throw undefined;
      });

      logger.tryClearLocalLog();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'existsSync');
    });
  });

  describe('tryClearAllLoggers', () => {
    it('should call the singleton logger.log method 1 time', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'log');

      logger.tryClearAllLoggers();

      expect(singletonLogger.log).toHaveBeenCalled();
    });

    it('should ignore the singleton logger and noop singleton logger', () => {
      const singletonLogger = logger.singleton;
      const noopSingletonLogger = logger.noopSingleton;
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      logger.tryClearAllLoggers();

      const loggers = logger['_loggers']; // tslint:disable-line: no-string-literal

      expect(loggers.find((logger) => logger.name === singletonLogger.name)).toBeDefined();
      expect(loggers.find((logger) => logger.name === noopSingletonLogger.name)).toBeDefined();
      expect(loggers.find((logger) => logger.name === log.name)).toBeUndefined();
    });

    it('should call the singleton logger.warning method if there was an error clearing the loggers', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      jest.spyOn(logger['_loggers'] as any, 'filter' as any).mockImplementation(() => {
        throw new Error('some error');
      });

      logger.tryClearAllLoggers();

      expect(singletonLogger.warning).toHaveBeenCalled();

      // tslint:disable-next-line: no-string-literal
      endMock(logger['_loggers'], 'filter');
    });
  });

  describe('log', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.log);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.log(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.log(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.log(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.log('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'log');

      await log.log('message');

      expect(log.log).toHaveBeenCalledWith('message');

      await log.log('message', 1, 2, 3);

      expect(log.log).toHaveBeenCalledWith('message', 1, 2, 3);

      jest.spyOn(console, 'log');

      await log.log('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.log('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.log as any).mockRestore();
    });
  });

  describe('warning', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.warning);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.warning(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.warning(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.warning(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.warning('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'warning');

      await log.warning('message');

      expect(log.warning).toHaveBeenCalledWith('message');

      await log.warning('message', 1, 2, 3);

      expect(log.warning).toHaveBeenCalledWith('message', 1, 2, 3);

      jest.spyOn(console, 'log');

      await log.warning('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.warning('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.warning as any).mockRestore();
    });
  });

  describe('trace', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.trace);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.trace(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.trace(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.trace(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.trace('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'trace');

      await log.trace('message');

      expect(log.trace).toHaveBeenCalledWith('message');

      await log.trace('message', 1, 2, 3);

      expect(log.trace).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.trace('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.trace('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.trace as any).mockRestore();
    });
  });

  describe('debug', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.debug);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.debug(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.debug(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.debug(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.debug('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'debug');

      await log.debug('message');

      expect(log.debug).toHaveBeenCalledWith('message');

      await log.debug('message', 1, 2, 3);

      expect(log.debug).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.debug('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.debug('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.debug as any).mockRestore();
    });
  });

  describe('information', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.information);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.information(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.information(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.information(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.information('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'information');

      await log.information('message');

      expect(log.information).toHaveBeenCalledWith('message');

      await log.information('message', 1, 2, 3);

      expect(log.information).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.information('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.information('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.information as any).mockRestore();
    });
  });

  describe('error', () => {
    it('should throw if the instance type is not an instanceof logger', (done) => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      function callback(logFunc: (msg: string) => Promise<void>) {
        expect(async () => {
          await logFunc('message');
        }).rejects.toThrow();

        done();
      }

      callback(log.error);
    });

    it('should throw if the message is undefined or null', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error(undefined as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.error(null as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is not a string or function', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error(1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.error(true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is a function and the function returns a value that is not a string', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error(() => 1 as any);
      }).rejects.toThrow();

      expect(async () => {
        await log.error(() => true as any);
      }).rejects.toThrow();
    });

    it('should throw if the message is empty', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      expect(async () => {
        await log.error('');
      }).rejects.toThrow();
    });

    it('should log the message to the console', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);

      jest.spyOn(log, 'error');

      await log.error('message');

      expect(log.error).toHaveBeenCalledWith('message');

      await log.error('message', 1, 2, 3);

      expect(log.error).toHaveBeenCalledWith('message', 1, 2, 3);

      log.logToConsole = false;

      jest.spyOn(console, 'log');

      await log.error('message');

      expect(console.log).not.toHaveBeenCalled();

      log.logLevel = LogLevel.None;

      await log.error('message');

      expect(console.log).not.toHaveBeenCalled();

      // Stop spying on console.log
      (console.log as any).mockRestore();
      (log.error as any).mockRestore();
    });
  });

  describe('misc_cutLogPrefix', () => {
    it('should set _cachedNonColorPrefix if set and the logger is non-color', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, true, false);

      log.log('blah blah blah');

      expect(log['_cachedNonColorPrefix']).toBeDefined();
    });

    it('should set _cachedColorPrefix if set and the logger is colored', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, true, true);

      log.log('blah blah blah');

      expect(log['_cachedColorPrefix']).toBeDefined();
    });
  });

  describe('misc_logLocally', () => {
    it('should set the _logToFileSystem property to false and call _closeFileStream if an error is encountered', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const nonFileLog = new logger('non-file-logger', LogLevel.Trace, false, true, false);

      log['_logToFileSystem'] = true;
      log['_lockedFileWriteStream'] = fs.createWriteStream('abc');

      jest.spyOn(log, '_closeFileStream' as any);
      jest.spyOn(nonFileLog, '_closeFileStream' as any);

      mock(log['_lockedFileWriteStream'], 'write', () => {
        throw new Error('some error');
      });

      await log.log('blah');
      await nonFileLog.log('blah');

      expect(log['_closeFileStream']).toHaveBeenCalled();
      expect(log['_logToFileSystem']).toBe(false);
      expect(nonFileLog['_closeFileStream']).not.toHaveBeenCalled();

      endMock(fs, 'existsSync');
    });

    it('should call the logger.warning method if an error is encountered', async () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const nonFileLog = new logger('non-file-logger', LogLevel.Trace, false, true, false);

      log['_logToFileSystem'] = true;
      log['_lockedFileWriteStream'] = fs.createWriteStream('abc');

      jest.spyOn(log, 'warning');
      jest.spyOn(nonFileLog, 'warning');
      mock(log['_lockedFileWriteStream'], 'write', () => {
        throw new Error('some error');
      });

      await log.log('blah');
      await nonFileLog.log('blah');

      expect(log.warning).toHaveBeenCalled();
      expect(nonFileLog.warning).not.toHaveBeenCalled();

      log['_logToFileSystem'] = true;
      log['_lockedFileWriteStream'] = fs.createWriteStream('abc');

      mock(log['_lockedFileWriteStream'], 'write', () => {
        throw '';
      });

      await log.log('blah');
      await nonFileLog.log('blah');

      expect(log.warning).toHaveBeenCalled();
      expect(nonFileLog.warning).not.toHaveBeenCalled();

      log['_logToFileSystem'] = true;
      log['_lockedFileWriteStream'] = fs.createWriteStream('abc');

      mock(log['_lockedFileWriteStream'], 'write', () => {
        throw undefined; /////////////////////////////////////////////////////////////////////////////
      });

      await log.log('blah');
      await nonFileLog.log('blah');

      expect(log.warning).toHaveBeenCalled();
      expect(nonFileLog.warning).not.toHaveBeenCalled();
    });
  });

  describe('misc_createFileName', () => {
    it('should set the _logToFileSystem property to false and call _closeFileStream in an error is encountered', () => {
      const log = new logger('logger', LogLevel.Trace, true, true, false);
      const nonFileLog = new logger('non-file-logger', LogLevel.Trace, false, true, false);

      log['_logToFileSystem'] = true;

      jest.spyOn(log, '_closeFileStream' as any);
      jest.spyOn(nonFileLog, '_closeFileStream' as any);

      mock(fs, 'mkdirSync', () => {
        throw new Error('some error');
      });

      log['_createFileName']();

      expect(log['_closeFileStream']).toHaveBeenCalled();
      expect(log['_logToFileSystem']).toBe(false);
      expect(nonFileLog['_closeFileStream']).not.toHaveBeenCalled();

      endMock(fs, 'mkdirSync');
    });

    it('should call the logger.warning method if there was a permission error', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'mkdirSync', () => {
        throw new CodeError('EPERM');
      });

      singletonLogger['_createFileName']();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'mkdirSync');
    });

    it('should call the logger.warning method if there was a non-code error', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'mkdirSync', () => {
        throw new Error('some error');
      });

      singletonLogger['_createFileName']();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'mkdirSync');
    });

    it('should call the logger.warning method if there was a non-error type error', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'mkdirSync', () => {
        throw 'non-error-type';
      });

      singletonLogger['_createFileName']();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'mkdirSync');
    });

    it('should call the logger.warning method if there was an unknown error', () => {
      const singletonLogger = logger.singleton;

      jest.spyOn(singletonLogger, 'warning');

      mock(fs, 'mkdirSync', () => {
        throw undefined;
      });

      singletonLogger['_createFileName']();

      expect(singletonLogger.warning).toHaveBeenCalled();

      endMock(fs, 'mkdirSync');
    });
  });
});
