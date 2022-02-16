import './App.less'
import type { Player, Room, Summary, PlayerRank } from '../../types'
import { notify } from '../utils'
import React, { useEffect, useState, createRef, useRef } from 'react'
import Rooms from './Rooms'
import InRoom from './InRoom'
import Dialog from './Dialog'
import Gaming from './Gaming'
import Avatar from './Avatar'

const messageRef = createRef<HTMLDivElement>()
const messages: JSX.Element[] = []
const Messages: React.FC = () => {
  const [, update] = useState(0)
  useEffect(() => {
    let i = 0
    const fn = (msg: string, name?: string, email?: string) => {
      messages.push(<p key={i++}>{email && name ? <Avatar email={email} alt={name} size={24} /> : <span className='no-avatar' />}{name && <b>{name}:&nbsp;</b>}{msg}</p>)
      update(++i)
    }
    $client.on('message', fn)
    return () => { $client.off('message', fn) }
  }, [])
  return <div id='messages' ref={messageRef}>{messages}</div>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
export let setPlayerStatusDialogOpen = (_val: boolean) => { }

let prevImage: string | undefined
let prevItem: string | undefined
let firstData = ''
let endData = ''
const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<Room>()
  const [chatText, setChatText] = useState('')
  const [words, setWords] = useState<string[]>([])
  const [stageData, setStageData] = useState<string>()
  const [playerStatus, setPlayerStatus] = useState<Player[]>([])
  const [playerStatusDialogOpen, setPlayerStatusDialogOpen0] = useState(false)
  const [judgeDialogOpen, setJudgeDialogOpen] = useState(false)
  const [summary, setSummary] = useState<Summary>()
  const [goals, setGoals] = useState<PlayerRank[]>()
  const messageTextRef = useRef<HTMLInputElement | null>(null)
  setPlayerStatusDialogOpen = setPlayerStatusDialogOpen0

  useEffect(() => {
    const onGameStart = (words: string[]) => {
      setWords(words)
      setSummary(undefined)
      setStageData(undefined)
      setPlayerStatus([])
      setPlayerStatusDialogOpen0(false)
      prevImage = prevItem = undefined
      notify()
    }
    const onStage = (data: string) => {
      setGoals(undefined)
      setStageData(data)
      setPlayerStatusDialogOpen(false)
      notify()
    }
    const onCurrentPlayerStatus = (data: Player[]) => {
      setPlayerStatus(data)
      if (data.find(p => p.id === $client.id)?.ready) setPlayerStatusDialogOpen0(true)
    }
    const onGameOver = (data: PlayerRank[]) => {
      setSummary(undefined)
      setStageData(undefined)
      setPlayerStatus([])
      setPlayerStatusDialogOpen0(false)
      setGoals(data)
      prevImage = prevItem = undefined
    }
    const onSummary = (data: Summary) => {
      if (!data.stage) prevImage = prevItem = undefined
      if (data.data.startsWith('data:image/png;base64,')) prevImage = data.data
      else prevItem = data.data
      setSummary(data)
    }
    const onNeedJudge = (data: boolean, first: string, end: string) => {
      if (data) {
        firstData = first
        endData = end
        setTimeout(() => {
          notify()
          setJudgeDialogOpen(true)
        }, 8000, true)
      } else setJudgeDialogOpen(false)
    }
    $client.on('inRoom', setCurrentRoom)
      .on('gameStart', onGameStart)
      .on('stage', onStage)
      .on('playerStatus', setPlayerStatus)
      .on('currentPlayerStatus', onCurrentPlayerStatus)
      .on('gameOver', onGameOver)
      .on('summary', onSummary)
      .on('needJudge', onNeedJudge)
      .emit('queryInGameStatus')
    $client.io.on('reconnect', () => $client.emit('queryInGameStatus'))
    const onKeyPress = (e: any) => {
      if (e.code === 'Enter' && !(e.target instanceof HTMLInputElement) && messageTextRef.current && !messageTextRef.current.parentElement!.className) {
        messageTextRef.current.parentElement!.className = 'active'
        if (messageRef.current) messageRef.current.className = 'active'
        messageTextRef.current.focus()
      }
    }
    document.addEventListener('keypress', onKeyPress)
    return () => {
      document.removeEventListener('keypress', onKeyPress)
      $client.off('inRoom', setCurrentRoom)
        .off('gameStart', onGameStart)
        .off('playerStatus', setPlayerStatus)
        .off('stage', onStage)
        .off('currentPlayerStatus', onCurrentPlayerStatus)
        .off('gameOver', onGameOver)
        .off('summary', onSummary)
        .off('needJudge', onNeedJudge)
    }
  }, [])

  const sendMessage = (e: any) => {
    console.log()
    const className = e.currentTarget.parentElement!.className = e.currentTarget.parentElement!.className ? '' : 'active'
    if (messageRef.current) messageRef.current.className = className
    if (!className && chatText) {
      $client.emit('sendMessage', chatText)
      setChatText('')
    }
  }

  const chatActions = (
    <div id='chat-actions'>
      <button className='btn-small' onClick={sendMessage} />
      <input
        type='text'
        placeholder='信息'
        id='chat-text'
        value={chatText}
        ref={messageTextRef}
        onChange={e => setChatText(e.target.value)}
        onKeyPress={e => {
          if (e.code !== 'Enter') return
          e.preventDefault()
          sendMessage(e)
        }}
      />
    </div>
  )

  const playerStatusDialog = (
    <Dialog open={playerStatusDialogOpen} title='玩家状态'>
      {playerStatus.map(({ email, name, ready }, i) => (
        <div key={i}><Avatar email={email} alt={name} size={24} /> {name}: {ready ? <b className='text-success'>✓</b> : <b className='text-danger'>×</b>}</div>
      ))}
    </Dialog>
  )

  if (summary) {
    const isImage = summary.data.startsWith('data:image/png;base64,')
    const src = isImage ? summary.data : prevImage
    return (
      <>
        <nav className='border split-nav in-room-nav'>
          <div className='nav-brand'>
            <h4>{summary.player.email && <Avatar email={summary.player.email} alt={summary.player.name} size={30} />} {summary.player.name} {isImage
              ? <>画了: <b>{prevItem}</b></>
              : <>认为这是: <b className='guess-text'>{summary.data}</b></>}
            </h4>
          </div>
        </nav>
        {chatActions}
        <div className='summary'><img className='other-image' src={src} key={src} /></div>
        <Dialog open={judgeDialogOpen} title='这合理吗?' className='summary-dialog'>
          {endData.startsWith('data:image/png;base64,')
            ? (
              <>
                <h3>这是: <b>{firstData}</b> 吗?</h3>
                <div className='summary-image'><img src={endData} /></div>
              </>)
            : (
              <>
                从【<b>{firstData}</b>】到【<b>{endData}</b>】
              </>)}
          <button
            className='text-success'
            onClick={() => {
              $client.emit('judge', true)
              setJudgeDialogOpen(false)
            }}
          >
            合理
          </button>
          <button
            className='text-danger'
            onClick={() => {
              $client.emit('judge', false)
              setJudgeDialogOpen(false)
            }}
          >
            不合理
          </button>
        </Dialog>
        <Messages key='messages' />
      </>
    )
  }

  if (stageData) {
    return (
      <>
        <Gaming stageData={stageData} />
        {chatActions}
        {playerStatusDialog}
        <Messages key='messages' />
      </>
    )
  }

  return (
    <>
      {currentRoom ? <InRoom room={currentRoom} /> : <Rooms />}
      {currentRoom && chatActions}
      <Dialog open={!!words.length} title='选择一个词开始绘画'>
        <div className='words-selection'>
          {words.map(it => (
            <button
              key={it}
              onClick={e => {
                setWords([])
                $client.emit('submit', e.currentTarget.innerText)
                setPlayerStatusDialogOpen0(true)
              }}
            >
              {it}
            </button>
          ))}
        </div>
      </Dialog>
      <Dialog open={!!goals} title='排行榜' onClose={() => setGoals(undefined)} className='ranklist'>
        {goals?.map((it, i) => <div key={i}>{i + 1}.&nbsp;{it.email && <Avatar email={it.email} alt={it.name} size={24} />}&nbsp;{it.name}:&nbsp;<b>{it.goal}</b></div>)}
      </Dialog>
      {playerStatusDialog}
      <Messages key='messages' />
    </>
  )
}

export default App
