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
