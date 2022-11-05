# @mfdlabs/logging

Logger implementation that follows the MFDLABS [LOGDEV Standards](https://confluence.ops.vmminfra.net/display/LOGDEV/Standards).

# Example

TypeScript
```ts

// The logger can be imported like this:
import logger from "@mfdlabs/logging";
// Or this:
import { logger } from "@mfdlabs/logging";

// You can use the following member if you do not require another logger:
logger.singleton.log("Example message");
logger.singleton.log("Example message with formatting: %d", 123);

// If you require a custom name, or just a seperate logger:
const newLogger = new logger("custom-logger");

newLogger.log("Hello from custom logger!!!!");

```

# Exports

The package exports the following:

```ts

/* An enum containing log levels that can be input into the logger class constructor or logger.logLevel method. */
enum LogLevel { /* ... */ };

/* The main implementation for the logger class. */
class logger { /* ... */ };

```

# Constructor

You can either use logger.singleton or logger.noopSingleton to access the logger. If you require something different use the following constructor parameters:

| Argument Name   | Argument Type | Default Value   | Description                                                                                                                                                                       |
|-----------------|---------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| name            | string        | ***Required***  | The name of this new logger. It cannot be the same as an already existing logger or it will throw.                                                                                |
| logLevel        | LogLevel      | *LogLevel.Info* | The log level for this new logger. It must be a string if you are not using the LogLevel enum and must be a valid member of that enum.                                            |
| logToFileSystem | boolean       | *true*          | Should the logger create log files? If this is true and EACCES or EPERM is emitted it is auto disabled. You an override the default log directory via DEFAULT_LOG_FILE_DIRECTORY. |
| logToConsole    | boolean       | *true*          | Should the logger log to the console? This will automatically be disabled if there is no TTY found. Advised to not be used if you are running as a daemon.                        |
| cutLogPrefix    | boolean       | *true*          | Should the logging prefix be cut? It is advised that this is used in production environments as it reduces the resources used by loggers.                                         |
| logWithColor    | boolean       | *true*          | Should the ouput be colorful? It is advised that this is disabled in production as it creates larger strings in order to make them colorful.                                      |

# Properties

The following properties are available for the logger class:

| Property Name             | Property Type | Has Setter? | Is Static? | Description                                                                                                                                                                              |
|---------------------------|---------------|-------------|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| singleton                 | logger        | No          | Yes        | A static instance of the logger, it is advised you use this over creating new loggers if you don't require logs to be seperated by category.                                             |
| noopSingleton             | logger        | No          | Yes        | Essentially the same as logger.singleton except this will do nothing, i.e the logLevel is None, and it doesn't log the the console or log files.                                         |
| name                      | string        | Yes         | No         | The name of the logger, you can change this at runtime if you wish, but it must be a unique name.                                                                                        |
| logLevel                  | LogLevel      | Yes         | No         | The level of the logger, you can change this at runtime but it must be a valid LogLevel enum.                                                                                            |
| logToFileSystem           | boolean       | Yes         | No         | Is this logger writing to log files? This can be changed at runtime and will setup log files when the value is set or will teardown it's current file stream if unset.                   |
| logToConsole              | boolean       | Yes         | No         | Is this logger writing to the console? This can be changed at runtime.                                                                                                                   |
| cutLogPrefix              | boolean       | Yes         | No         | Is the logger's prefix being cut? This can be changed at runtime and is advised for production environments as log prefixes can get lengthy.                                             |
| logWithColor              | boolean       | Yes         | No         | Is the logger's console output colorful? This can be changed at runtime and is advised to be disabled in production environments as it extends the log string with invisible characters. |
| fileName                  | string        | No          | No         | The name of the file that the file system logger is writing to. This is only set if logger.logToFileSystem is enabled and didn't fail to create the log file.                            |
| fullyQualifiedLogFileName | string        | No          | No         | The fully qualified name of the file that the file system logger is writing to. Essentially the same as logger.fileName except this includes the full path.                              |

# Methods

The following methods are made available for you to use.
All "log" methods use the same set of arguments, the first being the format string, or a method that returns a string and then the next being a vararray of "any".
All of the log methods are also asynchronous and be called without blocking the main thread.

logger.{logMethod}(string|() => string, ...any[]);

| Method Name        | Return Type | Is Asynchronous? | Is Static? | Description                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|--------------------|-------------|------------------|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| tryClearLocalLog   | void        | No               | Yes        | A static method that tries to clear out the log file directory and reset all registered loggers. This is not advised as there could potentially be a logger that is writing the the directory from a non-managed app and this doesn't filter those out (TBD FUTURE). There is an environment variable that controls whether or not this method actually clears the folder or not, and this method has an argument to override that environment variable. |
| tryClearAllLoggers | void        | No               | Yes        | A static method that tries to remove all tracked loggers from the current environment. This needs to set a property on loggers that determines if they're disposed or not, please PPEC when this idea becomes true. Does not dispose of the singleton and noopSingleton loggers.                                                                                                                                                                         |
| log                | void        | Yes              | No         | The log method invokes an asynchronous log with the log level of Info.                                                                                                                                                                                                                                                                                                                                                                                   |
| warning            | void        | Yes              | No         | The warning method invokes an asynchronous log with the log level of Warning.                                                                                                                                                                                                                                                                                                                                                                            |
| trace              | void        | Yes              | No         | The trace method invokes an asynchronous log with the log level of Trace.                                                                                                                                                                                                                                                                                                                                                                                |
| debug              | void        | Yes              | No         | The debug method invokes an asynchronous log with the log level of Debug.                                                                                                                                                                                                                                                                                                                                                                                |
| information        | void        | Yes              | No         | The information method invokes an asynchronous log with the log level of Info.                                                                                                                                                                                                                                                                                                                                                                           |
| error              | void        | Yes              | No         | The error method invokes an asynchronous log with the log level of Error.                                                                                                                                                                                                                                                                                                                                                                                |

# Environment variables

This logging utility utilizes @mfdlabs/environment to setup it's default singleton logger. The following environment variables are available to you to modify the default behavior:

| Environment Variable Name         | Environment Variable Type | Default Value          | Description                                                                                                                                                                                                                            |
|-----------------------------------|---------------------------|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| PERSIST_LOCAL_LOGS                | boolean                   | *false*                | If you set this environment variable, the logger will persist it's log files even if a clearance is requested. This can be overridden in the logger.clearLocalLog method with the 'override' parameter.                                |
| DEFAULT_LOGGER_CUT_PREFIX         | boolean                   | *true*                 | If true, then the logger will cut the prefix of the log message in order to read the log message more easily. This is advised to always be set in production if you use the singleton logger.                                          |
| DEFAULT_LOGGER_NAME               | string                    | *"singleton-logger"* | The default name of the singleton logger. When changing this you need to make sure it is a valid name or the getter for logger.singleton and logger.noopSingleton will throw!                                                          |
| DEFAULT_LOGGER_LOG_TO_FILE_SYSTEM | boolean                   | *true*                 | If true, the singleton logger will log to the file system by default.                                                                                                                                                                  |
| DEFAULT_LOGGER_LOG_TO_CONSOLE     | boolean                   | *true*                 | If true, the singleton logger will log to the console by default.                                                                                                                                                                      |
| DEFAULT_LOG_LEVEL                 | LogLevel                  | *Info*                 | The default log level for the singleton logger. This is advised to be set to something low in production environments.                                                                                                                 |
| DEFAULT_LOG_FILE_DIRECTORY        | string                    | *null*                 | The default log file directory, if this is unset it will place all log files in inside a folder called "logs" on your project root, or if you installed it globally it will write to a folder called "logs" in your global npm folder. |