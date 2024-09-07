import React from "react";

const VideoPlaceholder = ({ title }) => {
  return (
    <div className="flex-1 bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="h-48 w-full flex items-center justify-center">
        <p className="text-gray-300 text-xl">{title}</p>
      </div>
    </div>
  );
};

export default VideoPlaceholder;
