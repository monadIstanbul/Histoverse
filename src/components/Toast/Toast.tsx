import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in
    setIsVisible(true);

    // Auto close after 4 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green bg-green bg-opacity-10 text-green';
      case 'error':
        return 'border-red bg-red bg-opacity-10 text-red';
      case 'info':
      default:
        return 'border-glow bg-glow bg-opacity-10 text-glow';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <div className={`fixed top-24 right-8 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
    }`}>
      <div className={`
        panel p-4 rounded-lg border max-w-sm 
        ${getToastStyles()}
        animate-slide-up
      `}>
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="text-xl flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1">
            <p className="text-ui font-medium leading-relaxed">
              {message}
            </p>
          </div>

          {/* Close Button */}
          <button 
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="text-dim hover:text-text transition-colors flex-shrink-0 ml-2"
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 w-full bg-dim bg-opacity-30 rounded-full h-1">
          <div 
            className={`h-1 rounded-full transition-all duration-4000 ease-linear ${
              type === 'success' ? 'bg-green' : type === 'error' ? 'bg-red' : 'bg-glow'
            }`}
            style={{ 
              width: isVisible ? '0%' : '100%',
              transitionDuration: '4000ms'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Toast;