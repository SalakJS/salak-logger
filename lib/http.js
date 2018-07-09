module.exports = (options, app) => {
  let { level, category } = Object.assign({}, {
    level: 'auto',
    category: 'http'
  }, options)

  return async (ctx, next) => {
    const meta = {
      start: Date.now()
    }

    let error

    meta.req = parseRequest(ctx.request)

    try {
      await next()
    } catch (err) {
      error = err
    } finally {
      meta.duration = Date.now() - meta.start
      meta.res = parseResponse(ctx.response)

      const logLevel = getLogLevel(meta.res.status, level)
      const msg = getParsedMsg(meta)
      app.logger[category][logLevel](msg)
    }

    if (error) {
      throw error
    }
  }
}

function getParsedMsg (meta) {
  const { req, res } = meta

  return `${req.ip} - - "${req.method} ${req.url} HTTP/${req.httpVersion}" ${res.status} ${res.headers.contentLength || 0} "${req.headers.referer || ''}" "${req.headers['user-agent'] || 'unknow'}" - ${meta.duration} ms`
}

function parseRequest (request) {
  const data = {
    headers: request.header,
    url: request.url,
    method: request.method,
    httpVersion: request.req.httpVersionMajor + '.' + request.req.httpVersionMinor,
    ip: request.header['x-forwarded-for'] || request.ip || request.ips
  }

  return data
}

function parseResponse (response) {
  const data = {
    status: response.status,
    headers: {
      contentLength: response.header['content-length'] || response.length || 0
    }
  }

  return data
}

function getLogLevel (statusCode = 200, defaultLevel) {
  if (defaultLevel === 'auto') {
    if (statusCode >= 400) {
      return 'error'
    }

    if (statusCode >= 300) {
      return 'warn'
    }

    return 'info'
  }

  return defaultLevel
}
