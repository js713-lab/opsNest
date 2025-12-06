import React, { Fragment } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Content wrapper for scrollability */}
      <div className="relative z-50 w-full h-full flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg border-2 border-black bg-white p-6 shadow-lg sm:rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-md">
              <X size={18} />
            </Button>
          </div>
          
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

