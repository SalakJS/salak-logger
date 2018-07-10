const logger = require('..')
const winston = require('winston')
const Koa = require('koa')
const fse = require('fs-extra')
const path = require('path')
const stdMocks = require('std-mocks')
const request = require('supertest')

const appPath = __dirname

let app

function sleep (ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true)
    }, ms)
  })
}

function createLogger (options = {}) {
  return logger(options, app)
}

function expectMatchedLog (logPath, level, message, label = 'default') {
  expect(fse.readFileSync(path.join(appPath, 'logs', logPath)).toString()).toMatch(`[${level}] ${label}/${process.pid} - ${message}`)
}

describe('test salak-logger', () => {
  beforeEach(() => {
    app = new Koa()
    app.baseDir = appPath
    stdMocks.use()
  })

  afterEach(() => {
    stdMocks.restore()
    fse.removeSync(path.join(appPath, 'logs'))
  })

  describe('test default options', () => {
    it('must console in development', async () => {
      app.env = 'development'
      app.logger = createLogger()
      app.logger.info('test')

      await sleep(100)
      const output = stdMocks.flush()
      expect(output.stdout.length).toBe(1)
      expect(output.stdout[0]).toMatch(`default/${process.pid} -`)
      expectMatchedLog('default/default.log', 'INFO', 'test')
    })

    it('not console in production', async () => {
      app.env = 'production'
      app.logger = createLogger()
      app.logger.info('test')

      await sleep(100)
      const output = stdMocks.flush()
      expect(output.stdout.length).toBe(0)
      expectMatchedLog('default/default.log', 'INFO', 'test')
    })

    it('should logging different data', async () => {
      app.logger = createLogger()

      app.logger.info('test', 'salak-logger')
      app.logger.info('test', 'salak-logger', { user: 'salak' })
      app.logger.info({ logger: 'salak-logger' })
      app.logger.user.info('username')
      app.logger.error(new Error('salak-logger'))
      app.logger.default.log({
        level: 'error',
        message: new Error('errorFromMessage')
      })
      await sleep(100)
      expectMatchedLog('default/default.log', 'INFO', 'test salak-logger')
      expectMatchedLog('default/default.log', 'INFO', 'username', 'user')
      expectMatchedLog('default/default.log', 'INFO', 'test salak-logger { user: \'salak\' }')
      expectMatchedLog('default/default.log', 'INFO', '{ logger: \'salak-logger\' }')
      expectMatchedLog('default/default.log', 'ERROR', 'salak-logger')
      expectMatchedLog('default/default.log', 'ERROR', 'errorFromMessage')
    })

    it('should capture http request', async () => {
      app.logger = logger({}, app)
      app.use(async (ctx, next) => {
        const query = ctx.request.query || {}
        if (query.to === '404') {
          ctx.status = 404
          return
        }

        if (query.to === '301') {
          ctx.status = 301
          ctx.redirect('/')
          return
        }

        if (query.to === 'error') {
          throw new Error('errorWithThrow')
        }

        ctx.body = 'hello, salak.'
      })

      const testOutput = async (requestPath = '/', statusCode = 200, level = 'INFO') => {
        const response = await request(app.callback()).get(requestPath)
        await sleep(100)
        expect(response.statusCode).toBe(statusCode)
        expectMatchedLog('access/access.log', level, '', 'http')
      }

      await testOutput('/', 200, 'INFO')
      await testOutput('/?to=301', 301, 'WARN')
      await testOutput('/?to=404', 404, 'ERROR')

      const errorByThrow = await request(app.callback()).get('/?to=error')
      await sleep(100)
      expect(errorByThrow.statusCode).toBe(500)
    })
  })

  describe('test options category', () => {
    it('should logging to default.log', async () => {
      app.logger = createLogger({
        category: {
          transports: ['default']
        }
      })

      app.logger.info('test')
      await sleep(100)
      expectMatchedLog('default.log', 'INFO', 'test')
    })

    it('should logging to transport instance which provided', async () => {
      app.logger = createLogger({
        category: {
          transports: [
            'default',
            new winston.transports.File({
              filename: path.join(appPath, 'logs', 'test.log')
            })
          ]
        }
      })

      app.logger.info('test')
      await sleep(100)
      expectMatchedLog('default.log', 'INFO', 'test')
      expectMatchedLog('test.log', 'INFO', 'test')
    })
  })

  describe('test options transports', () => {
    it('should logging to spec file', async () => {
      app.logger = createLogger({
        transports: {
          default: {
            type: 'file',
            filename: 'spec.log'
          }
        },
        category: {
          transports: ['default']
        }
      })

      app.logger.info('test')
      await sleep(100)
      expectMatchedLog('spec.log', 'INFO', 'test')
    })
  })

  describe('test options capture', () => {
    it('should not capturing http request with capture.enable = false', async () => {
      app.logger = createLogger({
        capture: {
          enable: false
        }
      })
      app.use(async (ctx, next) => {
        ctx.body = 'hello, salak.'
      })

      const response = await request(app.callback()).get('/')
      await sleep(100)
      expect(response.statusCode).toBe(200)
      expect(fse.readFileSync(path.join(appPath, 'logs', 'access', 'access.log')).toString()).toBe('')
    })

    it('should return level `INFO` when set capture.label = "info"', async () => {
      app.logger = createLogger({
        capture: {
          level: 'info'
        }
      })

      app.use(async (ctx, next) => {
        ctx.status = 404
      })

      const response = await request(app.callback()).get('/')
      await sleep(100)
      expect(response.statusCode).toBe(404)
      expectMatchedLog('access/access.log', 'INFO', '', 'http')
    })
  })

  describe('test options formatType', () => {
    it('log4js should return string', async () => {
      app.logger = createLogger()
      app.logger.info('test')
      await sleep(100)
      expectMatchedLog('default/default.log', 'INFO', 'test')
    })

    it('json should return json', async () => {
      app.logger = createLogger({
        formatType: 'json'
      })

      app.logger.info('test')
      app.logger.info('test', { user: 'salak' })
      app.logger.error(new Error('salak-error'))
      await sleep(100)
      expect(fse.readFileSync(path.join(appPath, 'logs', 'default', 'default.log')).toString()).toMatch('"message":"test"')
      expect(fse.readFileSync(path.join(appPath, 'logs', 'default', 'default.log')).toString()).toMatch('"splat":[{"user":"salak"}]')
      expect(fse.readFileSync(path.join(appPath, 'logs', 'default', 'default.log')).toString()).toMatch('"stack":"Error: salak-error')
    })
  })
})
