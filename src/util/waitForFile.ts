import logging from "../logging"
import { Translations } from "../types"
import { fetchGlotstack } from "./fetchGlotstack"
import type { Response } from 'undici'

const TIMEOUT = 5 * 60 * 1000

class FileWaitError extends Error {
  response: Response

  constructor(message: string, response: Response) {
    super(message)
    this.response = response
  }
}

export function waitForFile(url: string, apiKey: string): Promise<Translations> {
  return new Promise(async (resolve, reject) => {
    let resolved = false
    let fetching = false
    let timeout: NodeJS.Timeout | undefined = undefined;
    
    let interval = setInterval(async () => {
      if (resolved) {
        clearInterval(interval)
        return
      }
      if (fetching) {
        return
      }
      
      fetching = true
      const response = await fetchGlotstack(url, apiKey)
      fetching = false

      if (response.status === 404) {
        return;
      }

      if (response.status === 200) {
        const translations = (await response.json() as {data: Translations}).data
        resolved = true;
        clearTimeout(timeout);
        clearInterval(interval)
        resolve(translations)
      }
    }, 500)

    timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        clearInterval(interval)
        reject(new Error(`Timed out waiting for file: ${url}`))
      }
    }, TIMEOUT)

  })
}