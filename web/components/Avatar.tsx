import './App.less'
import React, { useState } from 'react'

const Avatar: React.FC<{ email: string, alt: string }> = ({ email, alt }) => {
  const [error, setError] = useState(false)
  return error
    ? <div className='avatar-fail background-primary'>{alt[0]}</div>
    : <img className='avatar' src={`https://www.gravatar.com/avatar/${email}?d=404`} alt={alt} onError={() => setError(true)} />
}

export default Avatar
