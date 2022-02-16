import { create, SimpleDrawingBoard } from 'simple-drawing-board'

const alerts = document.getElementById('alerts')!

export type ColorTypes = 'primary' | 'secondary' | 'success' | 'warning' | 'danger'

export const alert = (message: string, autoClose = false, type: ColorTypes = 'secondary') => {
  let elm = document.createElement('div')
  elm.className = 'alert dismissible alert-' + type
  elm.innerText = message
  const label = document.createElement('label')
  label.className = 'btn-close'
  label.innerText = 'X'
  elm.appendChild(label)
  alerts.appendChild(elm)
  const f = label.onclick = () => {
    if (!elm) return
    elm.remove()
    elm = null as any
  }
  if (autoClose) setTimeout(f, 5000)
  return f
}

export const generateID = () => Date.now().toString(36) + Math.random().toString(36).substring(2)

export type DrawingBoard = SimpleDrawingBoard & { eraserMode: boolean }

const getMidInputCoords = (old: { x: number, y: number }, coords: { x: number, y: number }) => ({ x: (old.x + coords.x) >> 1, y: (old.y + coords.y) >> 1 })

export const createDrawBoard = (elm: HTMLCanvasElement) => {
  const board: any = create(elm)
  board.eraserMode = false
  board._drawFrame = function () {
    this._timer = requestAnimationFrame(() => this._drawFrame())
    if (!this._isDrawing) return
    const isSameCoords =
      this._coords.old.x === this._coords.current.x &&
      this._coords.old.y === this._coords.current.y
    const currentMid = getMidInputCoords(
      this._coords.old,
      this._coords.current
    )
    const ctx = this._ctx

    ctx.beginPath()
    if (this.eraserMode) ctx.globalCompositeOperation = 'destination-out'
    ctx.moveTo(currentMid.x, currentMid.y)
    ctx.quadraticCurveTo(
      this._coords.old.x,
      this._coords.old.y,
      this._coords.oldMid.x,
      this._coords.oldMid.y
    )
    ctx.stroke()
    if (this.eraserMode) ctx.globalCompositeOperation = 'source-over'

    this._coords.old = this._coords.current
    this._coords.oldMid = currentMid

    if (!isSameCoords) this._ev.trigger('draw', this._coords.current)
  }
  return board as DrawingBoard
}

let notifiable = false
if ('Notification' in window) {
  if (Notification.permission === 'granted') notifiable = true
  else if (Notification.permission !== 'denied') {
    alert('请点击通过以弹出提示!')
    Notification.requestPermission().then(it => it === 'granted' && (notifiable = true))
  }
}

export const notify = (str = '到了你的回合!') => {
  // eslint-disable-next-line no-new
  if (notifiable && document.hidden) new Notification(str)
}
