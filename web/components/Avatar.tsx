import './App.less'
import React, { useState } from 'react'

const Avatar: React.FC<{ email?: string, alt: string, size?: number }> = ({ email, alt, size }) => {
  const [error, setError] = useState(false)
  return error || !email
    ? <span className='avatar background-primary' style={size ? { width: size, height: size, lineHeight: size + 'px' } : undefined}>{alt[0]}</span>
    : <img className='avatar' src={`https://cravatar.cn/avatar/${email}?d=404`} alt={alt} onError={() => setError(true)} style={size ? { width: size, height: size } : undefined} />
}

export default Avatar
