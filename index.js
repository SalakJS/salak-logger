const assert = require('assert')
const winston = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const fse = require('fs-extra')
const path = require('path')
const debug = require('debug')('salak-logger')
const format = require('./lib/format')
const httpLog = require('./lib/http')

const transportsType = {
  console: winston.transports.Console,
  file: winston.transports.File,
  http: winston.transports.Http,
  stream: winston.transports.Stream,
  dateFile: DailyRotateFile
}

module.exports = (options = {}, app) => {
  const { baseDir, env } = app
  const {
    root = path.join(baseDir, 'logs'),
    injectConsole = env === 'development',
    formatType = 'log4js',
    fileType = 'file',
    capture = {
      enable: true,
      category: 'http',
      level: 'auto'
    },
    defaultLevel = env === 'production' ? 'info' : 'debug'
  } = options
  const isSingleCategory = !!options.category
  const categories = isSingleCategory ? {
    default: options.category
  } : Object.assign({}, {
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
  }, options.categories)
  const createFileTransport = ({
    type = fileType,
    level,
    filename
  }) => {
    return {
      type: transportsType[type] ? type : 'file',
      level,
      filename: isSingleCategory ? `${filename}.log` : `${filename}/${filename}.log`
    }
  }
  const transports = Object.assign({}, {
    console: { type: 'console' },
    default: createFileTransport({ filename: 'default' }),
    app: !isSingleCategory && createFileTransport({ filename: 'app' }),
    http: !isSingleCategory && createFileTransport({ filename: 'access' }),
    error: createFileTransport({ filename: 'error', level: 'error' })
  }, options.transports)

  fse.ensureDirSync(root)

  const createTransportInstance = (key, options) => {
    const type = options && options.type
    assert(type && transportsType[type], `unknown type ${type}.`)

    if (key === 'console') {
      options = Object.assign({}, {
        format: format.consoleFormat()
      }, options)
    }

    if (type === 'file' || type === 'dateFile') {
      assert(options.filename, `transport ${key} must provide filename option.`)
      options.filename = path.join(root, options.filename)
      fse.ensureDirSync(path.dirname(options.filename))
    }

    return new transportsType[type](options)
  }

  const transportInstances = {}
  for (let key in transports) {
    if (transports[key]) {
      transportInstances[key] = createTransportInstance(key, transports[key])
    }
  }

  if (injectConsole) {
    for (let key in categories) {
      if (categories[key].transports && categories[key].transports.indexOf('console') === -1) {
        categories[key].transports.push('console')
      }
    }
  }

  const createLogger = (label, {
    transports = ['default'],
    level = defaultLevel
  }) => {
    return winston.createLogger({
      level,
      format: format.combine(label, formatType),
      exitOnError: false,
      transports: transports.map((item) => {
        if (typeof item === 'string') {
          return transportInstances[item]
        }

        return item
      }).filter((item) => !!item)
    })
  }

  const target = {}
  for (let key in categories) {
    assert(categories[key].transports, `logger: ${key} must provide transports option`)
    target[key] = createLogger(key, categories[key])
    debug(`register category: ${key}`)
  }

  const levels = ['silly', 'debug', 'verbose', 'info', 'warn', 'error']
  levels.forEach((method) => {
    const logger = target['default']
    target[method] = logger[method].bind(logger)
    debug(`register default logger method: ${method}`)
  })

  const loggerObj = new Proxy(target, {
    get (target, key, receiver) {
      if (!target[key]) {
        target[key] = createLogger(key, categories['default'])
      }

      return Reflect.get(target, key, receiver)
    }
  })

  if (capture.enable !== false) {
    app.use(httpLog(capture, app))
    debug('enable capture http request')
  }

  return loggerObj
}
