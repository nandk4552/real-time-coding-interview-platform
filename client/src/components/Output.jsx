import React from "react";

const Output = ({ output, isError, isLoading }) => {
  return (
    <div className="w-full">
      <p className="mb-2 text-lg font-semibold text-white">Output</p>

      <div
        className={`w-full h-[25vh] md:h-[30vh] lg:h-[35vh] xl:h-[40vh] p-4 border rounded-md overflow-auto bg-gray-800 shadow-lg ${
          isError
            ? "border-red-500 text-red-400"
            : "border-gray-700 text-gray-300"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="animate-pulse">Running Code...</p>
          </div>
        ) : output && output.length > 0 ? (
          output.map((line, i) => (
            <p key={i} className="whitespace-pre-line break-words">
              {line}
            </p>
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Click "Run Code" to see the output here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Output;
