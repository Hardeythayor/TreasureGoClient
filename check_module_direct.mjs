import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()))
page.on('response', (res) => {
  if (res.url().includes('recaptcha')) console.log('NET', res.status(), res.url().slice(0, 100))
})

await page.goto('http://localhost:5173/signup')

const result = await page.evaluate(async () => {
  function loadScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
      script.async = true
      script.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha))
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA.'))
      document.head.appendChild(script)
    })
  }

  const container = document.createElement('div')
  container.id = 'manual-test-container'
  document.body.appendChild(container)

  try {
    const grecaptcha = await Promise.race([
      loadScript(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('load timeout 10s')), 10000)),
    ])
    const widgetId = grecaptcha.render(container, {
      sitekey: '6LeJXoosAAAAAIn9V7gSCszsofV9pTlxbkRJLaoE',
    })
    return { ok: true, widgetId }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
})

console.log('RESULT:', JSON.stringify(result))
await page.waitForTimeout(2000)
console.log('container html:', await page.evaluate(() => document.getElementById('manual-test-container')?.outerHTML?.slice(0, 300)))

await browser.close()
