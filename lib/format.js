const { format } = require('winston')
const { LEVEL, SPLAT, MESSAGE } = require('triple-beam')
const os = require('os')
const util = require('util')
const colors = require('colors/safe')
const dateFormat = require('./date')

const STACK = Symbol('salak-logger#stack')

colors.setTheme({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'green',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'magenta'
})

const { combine, timestamp, json, label } = format

const enumerateErrorFormat = format((info) => {
  if (info.message instanceof Error) {
    info.message = info.message.message
    info[STACK] = info.message.stack
  }

  if (info instanceof Error) {
    return Object.assign({
      message: info.message,
      [STACK]: info.stack
    }, info)
  }

  return info
})

const colorizeStr = (needColorize = true) => {
  if (!needColorize) {
    return (str) => str
  }

  return (str, level) => colors[level](str)
}

const log4jsFormatWithColors = (needColorize) => {
  const colorize = colorizeStr(needColorize)

  return format((info) => {
    const { label = 'default', message } = info
    const splat = info[SPLAT]
    const stack = info[STACK]
    const level = info[LEVEL]

    let msg = message

    if (typeof message === 'object') {
      msg = util.format(message)
    }

    if (splat) {
      msg += ' ' + splat.map((item) => {
        if (typeof item === 'object') {
          return util.format(item)
        }

        return item
      }).join(' ')
    }

    msg = colorize(msg, level)
    if (stack) { // Error info
      msg += os.EOL + stack
    }

    info[MESSAGE] = `[${dateFormat(info.timestamp)}] [${colorize(level.toUpperCase(), level)}] ${label}/${process.pid} - ${msg}`

    return info
  })
}

const jsonFormat = format((info, opts) => {
  const splat = info[SPLAT]
  const stack = info[STACK]
  if (splat) {
    info['splat'] = splat
  }

  if (stack) {
    info['stack'] = stack
  }

  info['pid'] = process.pid

  return info
})

exports.combine = (labelName, type = 'log4js') => {
  const printFormat = type === 'log4js' ? [log4jsFormatWithColors(false)()] : [jsonFormat(), json()]

  return combine(
    label({ label: labelName }),
    timestamp(),
    enumerateErrorFormat(),
    ...printFormat
  )
}

exports.consoleFormat = () => {
  return log4jsFormatWithColors(true)()
}
