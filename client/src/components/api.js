import axios from "axios";
import { LANGUAGE_VERSIONS } from "../../constants";

const API = axios.create({
  baseURL: import.meta.env.VITE_PISTON_API,
});
export const excuteCode = async (language, sourceCode) => {
  const res = await API.post("/execute", {
    language: language,
    version: LANGUAGE_VERSIONS[language],
    files: [
      {
        content: sourceCode,
      },
    ],
  });
  return res.data;
};
