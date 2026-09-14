const PLUGIN = 'signalk-naviop-plugin'
const API_READ = '/signalk/v1/api/' + PLUGIN
const API_WRITE = '/plugins/' + PLUGIN

let authToken = sessionStorage.getItem('skAuthToken') || ''
let loggedIn = false
let authRequired = true
let loginUser = ''
let switches = []
let putting = null

function el (id) { return document.getElementById(id) }

function authHeaders (extra) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, extra || {})
  if (authToken) headers.Authorization = 'Bearer ' + authToken
  return headers
}

function httpError (res, data, url) {
  if (res.status === 401) {
    loggedIn = false
    authToken = ''
    sessionStorage.removeItem('skAuthToken')
    renderLogin()
    return new Error('Log in to Signal K to change switches')
  }
  return new Error((data && (data.error || data.message)) || res.status + ' ' + url)
}

async function getJson (url) {
  const res = await fetch(url, { credentials: 'include', headers: authHeaders() })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch (_) { data = { error: text } }
  if (!res.ok) throw httpError(res, data, url)
  return data
}

async function sendJson (url, method, body) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify(body || {})
  })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch (_) { data = { error: text } }
  if (!res.ok) throw httpError(res, data, url)
  return data
}

function skPutUrl (path) {
  return '/signalk/v1/api/vessels/self/' + String(path || '').split('.').join('/')
}

function renderLogin () {
  const form = el('loginForm')
  const who = el('loginWho')
  const need = authRequired && !loggedIn
  form.hidden = !need
  who.hidden = !loggedIn
  if (loggedIn) who.textContent = loginUser ? 'Signed in as ' + loginUser : 'Signed in'
}

async function checkLogin () {
  try {
    const res = await fetch('/skServer/loginStatus', {
      credentials: 'include',
      headers: authHeaders()
    })
    const data = await res.json().catch(() => ({}))
    authRequired = data.authenticationRequired !== false
    loggedIn = data.status === 'loggedIn'
    loginUser = data.username || ''
  } catch (_) {
    authRequired = true
    loggedIn = false
  }
  renderLogin()
}

function escapeHtml (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderPanel () {
  el('panel').innerHTML = switches.map((sw) => {
    const on = sw.state ? ' on' : ''
    const busy = putting === sw.nr ? ' disabled' : ''
    return (
      '<button type="button" class="sw' + on + '" data-nr="' + sw.nr + '"' + busy + '>' +
        '<span class="led" aria-hidden="true"></span>' +
        '<span class="title">' + escapeHtml(sw.title) + '</span>' +
      '</button>'
    )
  }).join('')
}

async function loadStatus () {
  const data = await getJson(API_READ + '/status')
  switches = data.switches || []
  const line = el('statusLine')
  if (!data.started) {
    line.textContent = 'Plugin not started'
  } else {
    line.textContent = loggedIn || !authRequired ? 'Bank ' + data.bank : 'Log in to change switches'
  }
  renderPanel()
}

async function putSwitch (sw) {
  if (putting != null) return
  if (authRequired && !loggedIn) {
    el('statusLine').textContent = 'Log in to Signal K to change switches'
    renderLogin()
    return
  }
  const next = sw.state ? 0 : 1
  putting = sw.nr
  renderPanel()
  try {
    try {
      await sendJson(skPutUrl(sw.path), 'PUT', { value: next })
    } catch (err) {
      if (!loggedIn) throw err
      await sendJson(API_WRITE + '/switches/' + sw.nr, 'PUT', { value: next })
    }
    sw.state = next
    renderPanel()
    await loadStatus()
  } catch (err) {
    el('statusLine').textContent = err.message
  } finally {
    putting = null
    renderPanel()
  }
}

el('panel').onclick = (ev) => {
  const btn = ev.target.closest('button.sw')
  if (!btn) return
  const nr = parseInt(btn.getAttribute('data-nr'), 10)
  const sw = switches.find((s) => s.nr === nr)
  if (sw) putSwitch(sw)
}

el('loginForm').onsubmit = async (ev) => {
  ev.preventDefault()
  const errEl = el('loginErr')
  errEl.textContent = ''
  const username = el('loginUser').value
  const password = el('loginPass').value
  try {
    const res = await fetch('/signalk/v1/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe: true })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      errEl.textContent = data.message || data.error || 'Login failed'
      return
    }
    authToken = data.token || ''
    if (authToken) sessionStorage.setItem('skAuthToken', authToken)
    el('loginPass').value = ''
    loggedIn = true
    loginUser = username
    renderLogin()
    el('statusLine').textContent = 'Signed in'
  } catch (err) {
    errEl.textContent = err.message || 'Login failed'
  }
}

checkLogin()
  .then(() => loadStatus())
  .catch((err) => {
    el('statusLine').textContent = err.message
  })

setInterval(() => {
  loadStatus().catch(() => {})
}, 1000)
