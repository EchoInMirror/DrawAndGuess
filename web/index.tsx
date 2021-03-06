import 'papercss/dist/paper.css'
import { render } from 'preact'
import { alert, generateID } from './utils'
import React from 'react'
import App from './components/App'
import socketIO from 'socket.io-client'

let ahead = false
let countdownInt = 0
const countdown = document.getElementById('countdown') as HTMLDivElement
const username = document.getElementById('username') as HTMLInputElement
const email = document.getElementById('email') as HTMLInputElement
username.value = localStorage.getItem('username') || ''
email.value = localStorage.getItem('email') || ''
document.getElementById('username-ok')!.onclick = () => {
  const name = username.value
  if (!name) {
    alert('请先输入你的游戏名!', true, 'danger')
    return
  }
  localStorage.setItem('username', name)
  localStorage.setItem('email', email.value)

  let token = localStorage.getItem('token')
  if (!token) localStorage.setItem('token', (token = generateID()))

  const io = window.$client = socketIO({ transports: ['websocket'], auth: { token, name, email: email.value } })
  io.on('connect', () => render(<App />, document.getElementById('root')!))
    .on('disconnect', () => alert('连接已断开!', true, 'danger'))
    .on('connect_error', e => alert(e.message || '连接失败!', true, 'danger'))
    .on('countdown', (time: number, ahead0: boolean) => {
      countdownInt = time
      if ((ahead = !!ahead0)) countdownInt -= 3
    })
}

setInterval(() => {
  if (countdownInt) {
    countdown.innerText = `倒计时: ${countdownInt--}秒`
    if (!countdownInt) {
      countdown.innerText = ''
      if (ahead) window.dispatchEvent(new Event('countdownEnd'))
    }
  }
}, 1000)

document.body.addEventListener('touchmove', e => e.preventDefault(), { passive: false })
