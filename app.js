require('dotenv').config()

const { Kutt } = require('kutt')

const kuttApi = process.env.KUTT_URL
const kuttKey = process.env.KUTT_KEY
const targetDomain = process.env.TARGET_DOMAIN || '*'
const targetDomainParamsPrefix = process.env.TARGET_DOMAIN_PARAMS_PREFIX || '*'

Kutt.set('api', `${kuttApi}/api/v2`).set('key', kuttKey)

const getParamsFromLink = (link, paramsPrefix) => {
  const urlAndParams = link.split('?')

  if (urlAndParams.length > 0) {
    let params = {}

    urlAndParams[1].split('&').forEach(param => {
      if (paramsPrefix != '*') {
        if (param.includes(paramsPrefix)) {
          const paramKeyAndValue = param.split('=')
          params[paramKeyAndValue[0]] = paramKeyAndValue[1]
        }
      } else {
        const paramKeyAndValue = param.split('=')
        params[paramKeyAndValue[0]] = paramKeyAndValue[1]
      }
    })

    return Object.keys(params).length === 0 ? null : params
  }

  return null
}

const getLinks = async () => {
  const kutt = new Kutt()
  const isHealthy = await kutt.health().check()

  if (!isHealthy) throw new Error('API is not healthy, aborted')

  const response = await kutt.links().list({ all: true, limit: 100, skip: 0 })

  if (!response || response.data.length === 0) return null

  return response.data
    .filter(link => (targetDomain === '*' ? true : link.target.includes(targetDomain)))
    .map(link => {
      return {
        targetUrl: link.target,
        targetShortUrl: link.link,
        targetCanonicalUrl: link.target.split('?')[0],
        params: getParamsFromLink(link.target, targetDomainParamsPrefix),
        visitCount: link.visit_count,
      }
    })
    .sort((a, b) => b.visitCount - a.visitCount)
}

const handleLinksStats = links => {
  if (!links) return

  console.log({
    links,
    linksCount: links.length,
  })
}

const start = async () => handleLinksStats(await getLinks())

start()
