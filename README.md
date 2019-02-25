# salak-logger

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/salak-logger.svg?style=flat-square
[npm-url]: https://npmjs.org/package/salak-logger
[travis-image]: https://img.shields.io/travis/SalakJS/salak-logger.svg?style=flat-square
[travis-url]: https://travis-ci.org/SalakJS/salak-logger
[coveralls-image]: https://img.shields.io/codecov/c/github/salakjs/salak-logger.svg?style=flat-square
[coveralls-url]: https://codecov.io/github/salakjs/salak-logger?branch=master
[david-image]: https://img.shields.io/david/SalakJS/salak-logger.svg?style=flat-square
[david-url]: https://david-dm.org/SalakJS/salak-logger
[download-image]: https://img.shields.io/npm/dm/salak-logger.svg?style=flat-square
[download-url]: https://npmjs.org/package/salak-logger

Salak logger, base on [winston](https://github.com/winstonjs/winston).

## Install

```bash
npm install --save salak-logger
```

## Usage

```javascript
const Koa = require('koa')
const logger = require('salak-logger')

const app = new Koa()
app.baseDir = __dirname
app.logger = logger({
  fileType: 'dateFile',
  formatType: 'log4js',
  defaultLevel: 'debug'
}, app)

app.logger.info('log')
```

## Options

- `root` **{String}** directory for storing logs, default `path.join(app.baseDir, 'logs')`
- `injectConsole` **{Boolean}** inject console transport for logger，default `true`
- `removeConsoleAfterServerStart` **{Boolean}** remove console transport after server start,default `app.env === 'production'`
- `formatType` **{String}** type for logger format, log4js or json, default `log4js`
- `fileType` **{String}** file type for storing log, file or dateFile, default `file`
- `category` **{Object}** optional, default `undefined`
- `categories` **{Object}** optional, be used when category was unset
- `capture` **{Object}** options to pass to the http request log
- `defaultLevel` **{String}** log output level, default `app.env === 'production' ? 'info' : 'debug'`
- `transports` **{Object}** transports for category
- `transportsDefaultOptions` **{Object}** default options for transports, like `file`, `dateFile`

## options for capture

- `enable` **{Boolean}** log the http request, default `true`
- `level` **{String}** logger level, when set to `auto`, the logger level will be seted by http status code, default `auto`
- `category` **{String}** logger category, default `http`

## options for transports

type: Map

default:
```javascript
transports: {
  console: { type: 'console' },
  default: createFileTransport({ filename: 'default' }),
  app: !isSingleCategory && createFileTransport({ filename: 'app' }),
  http: !isSingleCategory && createFileTransport({ filename: 'access' }),
  error: createFileTransport({ filename: 'error', level: 'error' })
}
```

- `key` **{String}** transport name
- `value` **{Object}** transport options
- `value.type` **{String}** can be set to 'console', 'file', 'http', 'stream', 'dateFile', refer [transport options](https://github.com/winstonjs/winston/blob/master/docs/transports.md), [dateFile options](https://github.com/winstonjs/winston-daily-rotate-file#options)

## options for transportsDefaultOptions

type: Map

```javascript
transportsDefaultOptions: {
  file: {
    maxFiles: 30, // 30 files
    maxsize: 100 * 1024 * 1024 // 100m
  }
}
```

## options for category

- `transports` **{Array<String|Transport>}** transport referred to transports which defined
- `level` **{String}** log level, default `${options.defaultLevel}`

## options for categories

type: Map

default:
```javascript
categories: {
  default: {
    transports: [
      'default',
      'error'
    ]
  },
  app: {
    transports: [
      'app',
      'error'
    ]
  },
  http: {
    transports: [
      'http'
    ]
  }
}
```

- `key` **{String}** category name
- `value` **{Object}** category options
- `value.transports` **{Array<String|Transport>}** transport referred to transports which defined
- `value.level` **{String}** log level, default `${options.defaultLevel}`

## License

MIT
