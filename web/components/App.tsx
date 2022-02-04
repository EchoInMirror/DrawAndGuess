import './App.less'
import type { Player, Room, Summary, PlayerRank } from '../../types'
import React, { useEffect, useState, createRef } from 'react'
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
const App: React.FC = () => {
  const [currentRoom, setCurrentRoom] = useState<Room>()
  const [showChatBox, setShowChatBox] = useState(true)
  const [chatText, setChatText] = useState('')
  const [words, setWords] = useState<string[]>([])
  const [stageData, setStageData] = useState<string>()
  const [playerStatus, setPlayerStatus] = useState<Player[]>([])
  const [playerStatusDialogOpen, setPlayerStatusDialogOpen0] = useState(false)
  const [judgeDialogOpen, setJudgeDialogOpen] = useState(false)
  const [summary, setSummary] = useState<Summary>()
  const [goals, setGoals] = useState<PlayerRank[]>()
  setPlayerStatusDialogOpen = setPlayerStatusDialogOpen0

  useEffect(() => {
    const onStage = (data: string) => {
      setGoals(undefined)
      setStageData(data)
      setPlayerStatusDialogOpen(false)
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
    $client.on('inRoom', setCurrentRoom)
      .on('gameStart', setWords)
      .on('stage', onStage)
      .on('playerStatus', setPlayerStatus)
      .on('currentPlayerStatus', onCurrentPlayerStatus)
      .on('gameOver', onGameOver)
      .on('summary', onSummary)
      .on('needJudge', setJudgeDialogOpen)
      .emit('queryInGameStatus')
    return () => {
      $client.off('inRoom', setCurrentRoom)
        .off('gameStart', setWords)
        .off('playerStatus', setPlayerStatus)
        .off('stage', onStage)
        .off('currentPlayerStatus', onCurrentPlayerStatus)
        .off('gameOver', onGameOver)
        .off('summary', onSummary)
        .off('needJudge', setJudgeDialogOpen)
    }
  }, [])

  const chatActions = (
    <div id='chat-actions'>
      <button
        className='btn-small'
        onClick={e => {
          setShowChatBox(!showChatBox)
          const className = e.currentTarget.parentElement!.className = showChatBox ? 'active' : ''
          if (messageRef.current) messageRef.current.className = className
          if (!showChatBox && chatText) {
            $client.emit('sendMessage', chatText)
            setChatText('')
          }
        }}
      />
      <input type='text' placeholder='信息' id='chat-text' value={chatText} onChange={e => setChatText(e.target.value)} />
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
        <Dialog open={judgeDialogOpen} title='你认为以上过程合理吗?'>
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
      <Dialog open={!!goals} title='排行榜' onClose={() => setGoals(undefined)}>
        {goals?.map((it, i) => <div key={i}>{i + 1}. {it.email && <Avatar email={it.email} alt={it.name} size={24} />} {it.name}: <b>{it.goal}</b></div>)}
      </Dialog>
      {playerStatusDialog}
      <Messages key='messages' />
    </>
  )
}

export default App
