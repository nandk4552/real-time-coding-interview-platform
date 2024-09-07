import React from "react";

const Output = ({ output, isError, isLoading }) => {
  return (
    <div className="w-full">
      <p className="mb-2 text-lg">Output</p>

      <div
        className={`w-full h-[25vh] p-2 border rounded-md overflow-auto ${
          isError ? "border-red-500 text-red-400" : "border-gray-700"
        }`}
      >
        {isLoading ? (
          <p>Loading...</p>
        ) : output ? (
          output.map((line, i) => <p key={i}>{line}</p>)
        ) : (
          'Click "Run Code" to see the output here'
        )}
      </div>
    </div>
  );
};

export default Output;
