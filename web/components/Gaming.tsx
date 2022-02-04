import './Gaming.less'
import React, { useState, useEffect, useRef } from 'react'
import Dialog from './Dialog'
import Sketch from 'react-color/lib/components/sketch/Sketch'
import { setPlayerStatusDialogOpen } from './App'
import { create, SimpleDrawingBoard } from 'simple-drawing-board'

let board: SimpleDrawingBoard | undefined
window.addEventListener('resize', () => {
  if (!board) return
  const box = board.canvas.getBoundingClientRect()
  board.canvas.width = box.width
  board.canvas.height = box.height
  const img = new Image()
  img.onload = () => (board!.canvas.getContext('2d')!.drawImage(img, 0, 0))
  img.src = (board as any)._history._present
})

let isImage = false
const Gaming: React.FC<{ stageData: string }> = ({ stageData }) => {
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [colorPickerDialogOpen, setColorPickerDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [color, setColor] = useState('#000')
  const [value, setValue] = useState('')
  const ref = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setValue('')
  }, [stageData])

  isImage = stageData.startsWith('data:image/png;base64,')
  useEffect(() => {
    const fn = () => {
      const value = isImage ? ref.current?.value : (board as any)?._history?._past?.length ? board!.toDataURL() : undefined
      if (value) $client.emit('submit', value)
      setValue('')
      setPlayerStatusDialogOpen(true)
      setConfirmDialogOpen(false)
    }
    window.addEventListener('countdownEnd', fn)
    return () => window.removeEventListener('countdownEnd', fn)
  }, [])

  const content = isImage
    ? (
      <>
        <div className='answer-input'>
          <input type='text' placeholder='这是...' value={value} onChange={e => setValue(e.target.value)} ref={ref} />
          <button
            className='btn-small'
            onClick={() => {
              $client.emit('submit', value)
              setValue('')
              setPlayerStatusDialogOpen(true)
            }}
          >
            提交
          </button>
        </div>
        <img src={stageData} className='other-image' />
      </>
      )
    : (
      <canvas
        ref={elm => {
          if (!elm || (board && elm === board.canvas)) return
          const timer = setInterval(() => {
            const box = elm.getBoundingClientRect()
            if (!box.width) return
            clearInterval(timer)
            elm.width = box.width
            elm.height = box.height
            if (board) board.destroy()
            board = create(elm)
            board.setLineColor(color)
          }, 20)
        }}
      />
      )

  const header = isImage
    ? <div className='nav-brand'><h4>这是什么?</h4></div>
    : (
      <>
        <div className='nav-brand'><h4>请绘制: <b>{stageData}</b></h4></div>
        <fieldset className='form-group'>
          <label htmlFor='line-size'>画笔粗细:</label>
          <input type='range' id='line-size' min='1' max='20' defaultValue='1' onChange={e => board?.setLineSize(+e.target.value)} />
        </fieldset>
        <div>
          <ul className='inline'>
            <li>
              <a
                href='#'
                style={{ color, textShadow: '0 0 1px #000' }}
                onClick={e => {
                  e.preventDefault()
                  setColorPickerDialogOpen(true)
                }}
              >
                颜色
              </a>
            </li>
            <li>
              <a
                href='#'
                onClick={e => {
                  e.preventDefault()
                  board?.undo()
                }}
              >
                撤销
              </a>
            </li>
            <li>
              <a
                href='#'
                onClick={e => {
                  e.preventDefault()
                  board?.redo()
                }}
              >
                重做
              </a>
            </li>
            <li>
              <a
                href='#'
                className='text-danger'
                onClick={e => {
                  e.preventDefault()
                  setClearDialogOpen(true)
                }}
              >
                清空
              </a>
            </li>
            <li>
              <a
                href='#'
                className='text-success'
                onClick={e => {
                  e.preventDefault()
                  if (!board) return
                  const b = board as any
                  if (b._history._past.length) {
                    $client.emit('submit', board.toDataURL())
                    setPlayerStatusDialogOpen(true)
                  } else setConfirmDialogOpen(true)
                }}
              >
                提交
              </a>
            </li>
          </ul>
        </div>
      </>
      )

  return (
    <>
      <div className='gaming'>
        <nav className='border split-nav in-room-nav'>{header}</nav>
        <nav className='border fixed split-nav in-room-nav'>{header}</nav>
        <div className='draw-board'>{content}</div>
      </div>
      {!isImage && (
        <>
          <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)} title='确认清空画板?'>
            <button
              className='text-danger'
              onClick={() => {
                board?.clear()
                setClearDialogOpen(false)
              }}
            >
              确认!
            </button>
          </Dialog>
          <Dialog open={colorPickerDialogOpen} onClose={() => setColorPickerDialogOpen(false)} title='请选择颜色'>
            <Sketch
              color={color}
              onChange={({ hex }) => setColor(hex)}
              onChangeComplete={({ hex }) => board?.setLineColor(hex)}
            />
          </Dialog>
          <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} title='你确定什么都不做就提交吗?'>
            <button
              className='text-danger'
              onClick={() => {
                if (!board) return
                $client.emit('submit', stageData)
                setConfirmDialogOpen(false)
                setPlayerStatusDialogOpen(true)
              }}
            >
              确认!
            </button>
            <button onClick={() => setConfirmDialogOpen(false)}>取消</button>
          </Dialog>
        </>
      )}
    </>
  )
}

export default Gaming
