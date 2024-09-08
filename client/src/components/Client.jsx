import React from "react";
import Avatar from "react-avatar";
const Client = ({ email }) => {
  return (
    <div className="space-x-2">
      <Avatar size="50" name={email} round={"14px"} />
    </div>
  );
};

export default Client;
