import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, children, onClose, wide=false, className='', showClose=true }: { title:string;children:ReactNode;onClose:()=>void;wide?:boolean;className?:string;showClose?:boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => { dialog.close(); }; }, []);
  return <dialog ref={ref} className={`modal ${wide?'modal-wide':''} ${className}`} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal-inner">{showClose ? <button className="icon-button modal-close" onClick={onClose} aria-label="关闭"><X size={20}/></button> : null}{children}</div>
  </dialog>;
}
