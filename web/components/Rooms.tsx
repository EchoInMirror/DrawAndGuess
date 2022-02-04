import './Rooms.less'
import type { Room } from '../../types'
import React, { useState, useEffect } from 'react'
import Avatar from './Avatar'

const Rooms: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  useEffect(() => {
    $client.on('rooms', setRooms).emit('fetchRooms')
    return () => $client.off('rooms', setRooms)
  }, [])

  const header = (
    <>
      <div className='nav-brand'>
        <h3><a href='#'>你画我猜</a></h3>
      </div>
      <div>
        <ul className='inline'>
          <li>
            <a
              href='#'
              onClick={e => {
                e.preventDefault()
                $client.emit('createRoom')
              }}
            >
              创建房间
            </a>
          </li>
        </ul>
      </div>
    </>
  )

  return (
    <>
      <nav className='border split-nav'>{header}</nav>
      <nav className='border fixed split-nav'>{header}</nav>
      <div className='row flex-spaces flex-middle rooms'>
        {rooms.map((it, i) => (
          <div className='card' key={i}>
            <div className='card-body'>
              <div className='avatar-wrapper'><Avatar email={it.players[0].email} alt={it.players[0].name} /></div>
              <h4 className='card-title'>{it.players[0].name} 的房间</h4>
              <h5 className='modal-subtitle'>人数: {it.players.length}</h5>
              {it.joinable && <button onClick={() => $client.emit('joinRoom', it.id)}>加入房间</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default Rooms
