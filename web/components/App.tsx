import './App.less'
import type { Room } from '../../types'
import React, { useEffect, useState } from 'react'
import Rooms from './Rooms'
import InRoom from './InRoom'
import Dialog from './Dialog'
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

const messages = document.getElementById('messages') as HTMLDivElement
const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<Room>()
  const [showChatBox, setShowChatBox] = useState(true)
  const [chatText, setChatText] = useState('')
  const [words, setWords] = useState<string[]>([])
  const [stageData, setStageData] = useState<string>()
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  useEffect(() => {
    $client.on('inRoom', setCurrentRoom)
      .on('message', (msg: string) => {
        const elm = document.createElement('p')
        elm.innerText = msg
        messages.appendChild(elm)
      })
      .on('gameStart', setWords)
      .on('stage', (data: string) => {
        console.log(data)
        setStageData(data)
      }).emit('queryInGameStatus')
    return () => $client.off('inRoom', setCurrentRoom)
  }, [])

  if (stageData) {
    const isImage = stageData.startsWith('data:image/png;base64,')
    const content = isImage
      ? (
        <img src={stageData} />
        )
      : (
        <canvas
          ref={elm => {
            if (!elm || (board && elm === board.canvas)) return
            setTimeout(() => {
              const box = elm.getBoundingClientRect()
              elm.width = box.width
              elm.height = box.height
              if (board) board.destroy()
              board = create(elm)
            }, 20)
          }}
        />
        )

    const header = isImage
      ? (
        <div className='nav-brand'><h4>你认为这是什么?</h4></div>
        )
      : (
        <>
          <div className='nav-brand'><h4>请绘制: {stageData}</h4></div>
          <fieldset className='form-group'>
            <label htmlFor='line-size'>画笔粗细:</label>
            <input type='range' id='line-size' min='1' max='20' defaultValue='1' onChange={e => board?.setLineSize(+e.target.value)} />
          </fieldset>
          <div>
            <ul className='inline'>
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
                  className='text-success'
                  onClick={e => {
                    e.preventDefault()
                    $client.emit('submit', board!.toDataURL())
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
        )}
      </>
    )
  }

  return (
    <>
      {currentRoom ? <InRoom room={currentRoom} /> : <Rooms />}
      {currentRoom && (
        <div id='chat-actions'>
          <button
            className='btn-small'
            onClick={e => {
              setShowChatBox(!showChatBox)
              e.currentTarget.parentElement!.className = messages.className = showChatBox ? 'active' : ''
              if (!showChatBox && chatText) {
                $client.emit('sendMessage', chatText)
                setChatText('')
              }
            }}
          />
          <input type='text' placeholder='信息' id='chat-text' value={chatText} onChange={e => setChatText(e.target.value)} />
        </div>
      )}
      <Dialog open={!!words.length} title='选择一个词开始绘画'>
        <div className='words-selection'>
          {words.map(it => (
            <button
              key={it}
              onClick={e => {
                setWords([])
                $client.emit('submit', e.currentTarget.innerText)
              }}
            >
              {it}
            </button>
          ))}
        </div>
      </Dialog>
    </>
  )
}

export default App
