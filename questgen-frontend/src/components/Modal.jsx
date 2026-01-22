import React from 'react'
import './Modal.css'

export default function Modal({ open, onClose, title, children, footer }){
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">{footer || <button className="btn" onClick={onClose}>Close</button>}</div>
      </div>
    </div>
  )
}
