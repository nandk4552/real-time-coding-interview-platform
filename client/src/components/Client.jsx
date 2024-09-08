import React from "react";
import Avatar from "react-avatar";
const Client = ({ email }) => {
  return (
    <div className=" space-x-2">
      <Avatar size="50" name={email} round={"14px"} />
      {/* <span className="text-gray-400 font-semibold">{email}</span> */}
      {/* <button
        // onClick={() => socket.emit("user:disconnect", socketId)}
        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg shadow-md transition duration-300"
      >
        Disconnect
      </button> */}
    </div>
  );
};

export default Client;
