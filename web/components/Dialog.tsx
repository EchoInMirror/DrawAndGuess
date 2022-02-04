import React from 'react'

const Dialog: React.FC<{ open?: boolean, onClose?: () => void, className?: string, title?: string }> = ({ open, onClose, children, title, className = '' }) => {
  return (
    <>
      <input className='modal-state' type='checkbox' checked={open} />
      <div className={'modal ' + className}>
        <label className='modal-bg' onClick={onClose} />
        <div className='modal-body'>
          {title && <h4 className='modal-title'>{title}</h4>}
          {onClose && <label className='btn-close' onClick={onClose}>X</label>}
          {children}
        </div>
      </div>
    </>
  )
}

export default Dialog
