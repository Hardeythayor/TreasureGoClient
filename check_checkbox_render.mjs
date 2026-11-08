import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text()))
page.on('pageerror', (err) => console.log('PAGE ERROR', err.message))
page.on('response', (res) => {
  if (res.url().includes('recaptcha')) console.log('NET', res.status(), res.url().slice(0, 100))
})
await page.goto('http://localhost:5173/signup')
await page.waitForTimeout(16000)

const iframe = page.frameLocator('iframe[title="reCAPTCHA"]').first()
const checkbox = iframe.locator('#recaptcha-anchor')
const visible = await checkbox.isVisible().catch(() => false)
console.log('checkbox widget visible on page:', visible)

const bodyText = await page.locator('body').innerText()
console.log('body text snippet:', bodyText.slice(0, 300))

const diag = await page.evaluate(() => ({
  hasGrecaptcha: typeof window.grecaptcha !== 'undefined',
  containerHtml: document.querySelector('form > div:nth-last-child(2)')?.outerHTML?.slice(0, 200),
}))
console.log('diag:', JSON.stringify(diag))

await page.screenshot({ path: '/private/tmp/claude-501/-Users-twotees-mac-Sites-treasure-go/e6092de9-0ffb-4dd8-aa78-9990513d5be7/scratchpad/signup_checkbox.png' })

await browser.close()
