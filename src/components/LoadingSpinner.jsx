import React from 'react'

const LoadingSpinner = ({ size = 'default', className = '' }) => {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
      <div className="flex-col gap-4 w-full flex items-center justify-center">
        <div className="w-28 h-28 border-8 text-blue-400 text-4xl animate-spin border-gray-300 flex items-center justify-center border-t-blue-400 rounded-full">
          <span className="font-bold text-blue-400">M</span>
        </div>
      </div>
    </div>
  )
}

export default LoadingSpinner
