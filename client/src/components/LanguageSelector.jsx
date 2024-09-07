import React, { useState } from "react";
import { LANGUAGE_VERSIONS } from "../../constants";

const languages = Object.entries(LANGUAGE_VERSIONS);
const ACTIVE_COLOR = "text-blue-400";

const LanguageSelector = ({ language, onSelect }) => {
  const [menuOpen, setMenuOpen] = useState(false); // State to toggle menu visibility

  const handleSelect = (lang) => {
    onSelect(lang); // Call the onSelect handler
    setMenuOpen(false); // Close the menu when a language is selected
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen); // Toggle the menu state
  };

  return (
    <div className="relative inline-block">
      {/* Button to toggle the menu */}
      <button
        className="bg-gray-500 text-white px-2 py-1 text-sm rounded-md"
        onClick={toggleMenu}
      >
        {language}
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute mt-1 w-40 bg-[#110c1b] rounded-md shadow-lg z-10">
          {languages.map(([lang, version]) => (
            <button
              key={lang}
              className={`w-full px-2 py-1 text-left text-sm text-white ${
                lang === language
                  ? "bg-gray-900 text-blue-400"
                  : "hover:bg-gray-900"
              }`}
              onClick={() => handleSelect(lang)}
            >
              {lang}&nbsp;
              <span className="text-gray-500 text-xs">({version})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
