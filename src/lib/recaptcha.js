const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? ''

let scriptPromise = null

function loadScript() {
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    // render=explicit: the widget itself is created explicitly below (once
    // per container), rather than auto-rendered from a site-wide script tag.
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
    script.async = true
    script.onload = () => window.grecaptcha.ready(() => resolve(window.grecaptcha))
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

// Renders the visible "I'm not a robot" checkbox into `container` — this
// key is a v2 Checkbox type, not Invisible, so there's no execute()-on-submit
// flow: the person ticks the box themselves, whenever they like, before
// submitting. Returns the widget id the other two functions below need.
export async function renderRecaptcha(container) {
  if (!SITE_KEY) {
    throw new Error('reCAPTCHA is not configured (VITE_RECAPTCHA_SITE_KEY is unset).')
  }
  const grecaptcha = await loadScript()
  return grecaptcha.render(container, { sitekey: SITE_KEY })
}

// '' if the checkbox hasn't been ticked (or its token already expired) —
// callers treat that as "not completed yet," not as an error of their own.
export function getRecaptchaResponse(widgetId) {
  return window.grecaptcha?.getResponse(widgetId) ?? ''
}

// A checkbox token is single-use — call this after every submit attempt
// (success or failure) so the widget is ready for the person to tick again.
export function resetRecaptcha(widgetId) {
  window.grecaptcha?.reset(widgetId)
}
