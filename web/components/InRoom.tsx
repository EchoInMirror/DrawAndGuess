import './InRoom.less'
import React, { useState } from 'react'
import Avatar from './Avatar'
import Dialog from './Dialog'
import type { Room } from '../../types'

const InRoom: React.FC<{ room: Room }> = ({ room }) => {
  const [open, setOpen] = useState(false)
  const [round, setRound] = useState(1)
  const [words, setWords] = useState('')
  const currentToken = $client.id

  let isReady = false
  const players = room.players.map(({ name, id, email, ready }) => {
    if (id === currentToken && ready) isReady = true
    return (
      <div className='card' key={id}>
        <div className='card-body'>
          <Avatar email={email} alt={name} />
          <h4 className={'card-title' + (ready ? ' text-success' : '')}>{name}{ready ? ' ✓' : ''}</h4>
        </div>
      </div>
    )
  })

  const header = (
    <>
      <div className='nav-brand'>
        <h3><a href='#'>{room.players[0].name} 的房间</a></h3>
      </div>
      <div>
        <ul className='inline'>
          <li>
            <a
              href='#'
              style={isReady ? { color: 'var(--danger)', borderBottomColor: 'var(--danger)' } : { color: 'var(--success)', borderBottomColor: 'var(--success)' }}
              onClick={e => {
                e.preventDefault()
                $client.emit('ready')
              }}
            >
              {isReady ? '取消准备' : '准备'}
            </a>
          </li>
          <li>
            <a
              href='#'
              onClick={e => {
                e.preventDefault()
                $client.emit('getRoomSettings', (round: number, words: string) => {
                  setRound(round)
                  setWords(words)
                  setOpen(true)
                })
              }}
            >
              设置
            </a>
          </li>
          <li>
            <a
              href='#'
              onClick={e => {
                e.preventDefault()
                $client.emit('leaveRoom')
              }}
            >
              离开房间
            </a>
          </li>
        </ul>
      </div>
    </>
  )

  return (
    <>
      <nav className='border split-nav in-room-nav'>{header}</nav>
      <nav className='border fixed split-nav in-room-nav'>{header}</nav>
      <div className='row flex-spaces flex-middle in-room'>{players}</div>
      <Dialog
        open={open}
        title='房间设置'
        onClose={() => {
          setOpen(false)
          $client.emit('setRoomSettings', round, words)
        }}
      >
        <div className='form-group'>
          <label htmlFor='round-count'>回合数: {round}</label>
          <input type='range' id='round-count' min='1' max='10' value={round} onChange={e => setRound(+e.target.value)} />
        </div>
        <div className='form-group'>
          <label htmlFor='words'>候选词</label>
          <textarea id='words' placeholder='候选词' style={{ minHeight: '30vh', minWidth: '70vw' }} value={words} onChange={e => setWords(e.target.value)} />
        </div>
      </Dialog>
    </>
  )
}

export default InRoom
