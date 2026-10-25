// GG'APP boot script.
//
// Lives as a plain same-origin file (not an inline <script>) so the CSP can be
// written as `script-src 'self'` with no `unsafe-inline` — any injected inline
// <script> in the DOM then simply never runs. Content here must stay ES5-safe
// vanilla JS: it runs before the module bundle and in old browsers too.
(function () {
  var bootState = {
    mounted: false,
    errors: [],
  }

  window.__GG_APP_BOOT__ = bootState

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  function showBootFailure(reason) {
    if (bootState.mounted) return

    var existing = document.getElementById('gg-app-boot-error')
    var details = bootState.errors.length
      ? '<pre style="margin-top:12px;white-space:pre-wrap;font-size:12px;line-height:1.55;color:#2E3E5C;background:#FAF6F5;border:1px solid #EAE6E5;border-radius:10px;padding:12px;max-height:220px;overflow:auto;">' + escapeHtml(bootState.errors.join('\n\n')) + '</pre>'
      : ''

    var markup =
      '<div id="gg-app-boot-error" style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#EEF4FB;font-family:Neue Montreal,Helvetica Neue,Arial,sans-serif;">' +
        '<div style="width:min(560px,100%);background:#fff;border:1px solid #EAE6E5;border-radius:20px;box-shadow:0 20px 50px rgba(13,30,66,0.08);padding:24px 22px;">' +
          '<div style="font-size:24px;font-weight:800;letter-spacing:-0.015em;color:#091C44;margin-bottom:10px;">App failed to load</div>' +
          '<div style="font-size:14px;line-height:1.6;color:#2E3E5C;">' + escapeHtml(reason) + '</div>' +
          '<div style="font-size:13px;line-height:1.6;color:#2E3E5C;margin-top:8px;">Try reloading this page after the dev server is running. If it keeps happening, the error details below should help pinpoint the failing script.</div>' +
          details +
          // No inline onclick: script-src 'self' would block inline event
          // handlers, so the listener is attached after injection instead.
          '<button id="gg-app-boot-reload" style="margin-top:16px;padding:12px 16px;border:0;border-radius:12px;background:#38B6FF;color:#091C44;font-size:14px;font-weight:700;cursor:pointer;">Reload</button>' +
        '</div>' +
      '</div>'

    if (existing) {
      existing.outerHTML = markup
    } else {
      var root = document.getElementById('root')
      if (root) {
        root.innerHTML = markup
      } else {
        document.body.insertAdjacentHTML('beforeend', markup)
      }
    }

    var reloadButton = document.getElementById('gg-app-boot-reload')
    if (reloadButton) {
      reloadButton.addEventListener('click', function () {
        window.location.reload()
      })
    }
  }

  window.addEventListener('error', function (event) {
    var message = event && event.message ? event.message : 'Unknown startup error'
    bootState.errors.push('Error: ' + message)
  })

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason
    bootState.errors.push('Unhandled rejection: ' + (reason && reason.stack ? reason.stack : String(reason)))
  })

  window.setTimeout(function () {
    if (!bootState.mounted) {
      showBootFailure('The startup bundle did not mount the React app within a few seconds.')
    }
  }, 4000)

  // Service worker lifecycle (registration, dev cleanup) is handled
  // in src/services/pwa.ts once the app mounts.
})()
