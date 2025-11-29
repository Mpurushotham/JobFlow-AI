
import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { Notification, NotificationType } from '../context/NotificationContext';

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const icons: { [key in NotificationType]: React.ReactElement } = {
  success: <CheckCircle className="text-green-500" />,
  error: <XCircle className="text-red-500" />,
  info: <Info className="text-blue-500" />,
};

const colors: { [key in NotificationType]: string } = {
  success: 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-700',
  error: 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-700',
  info: 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700',
}

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <div 
      className={`max-w-sm w-full rounded-2xl shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${colors[notification.type]} animate-slide-in`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            {icons[notification.type]}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              {notification.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => onClose(notification.id)}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
