import {fetch} from 'undici'
import FormData from 'form-data'
import logging from '../logging'

export const fetchGlotstack = async function (url: string, apiKey: string, body?: Record<string, any> | FormData, overrideHeaders?: Record<string, any>) {
  const headers: Record<string, any> = {
    'authorization': `Bearer ${apiKey}`,
    ...(overrideHeaders == null ? {} : overrideHeaders),
  }

  let payloadBody: FormData | string | undefined = undefined
  let method = 'GET'

  headers['content-type'] = 'application/json'

  if (body && !(body instanceof FormData)) {
    method = 'POST'
    payloadBody = JSON.stringify(body)
  } else if (body != null) {
    method = 'POST'
    payloadBody = body
  }

  return fetch(url, { method, body: payloadBody, headers })
}