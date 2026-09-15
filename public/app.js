const PLUGIN = 'signalk-naviop-plugin'
const API = '/signalk/v1/api/' + PLUGIN

let switches = []
let putting = null

function el (id) { return document.getElementById(id) }

function setStatus (msg, isError) {
  const line = el('statusLine')
  if (!msg) {
    line.hidden = true
    line.textContent = ''
    line.classList.remove('error')
    return
  }
  line.hidden = false
  line.textContent = msg
  line.classList.toggle('error', !!isError)
}

async function getJson (url) {
  const res = await fetch(url, { credentials: 'include' })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch (_) { data = { error: text } }
  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || res.status + ' ' + url)
  }
  return data
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
        '<span class="title">' + escapeHtml(sw.title) + '</span>' +
        '<span class="led" aria-hidden="true"></span>' +
      '</button>'
    )
  }).join('')
}

async function loadStatus () {
  const data = await getJson(API + '/status')
  switches = data.switches || []
  if (!data.started) setStatus('Plugin not started', true)
  else setStatus('')
  renderPanel()
}

async function setSwitch (sw) {
  if (putting != null) return
  const next = sw.state ? 0 : 1
  putting = sw.nr
  renderPanel()
  try {
    await getJson(API + '/switches/' + sw.nr + '/' + next)
    sw.state = next
    renderPanel()
    await loadStatus()
  } catch (err) {
    setStatus(err.message, true)
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
  if (sw) setSwitch(sw)
}

loadStatus().catch((err) => setStatus(err.message, true))

setInterval(() => {
  loadStatus().catch(() => {})
}, 1000)
