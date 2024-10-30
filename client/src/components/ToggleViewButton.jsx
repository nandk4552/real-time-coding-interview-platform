import { AiOutlineCode, AiOutlineDesktop } from "react-icons/ai";

function ToggleViewButton({ showSharedScreen, handleToggleView }) {
  return (
    <div className="row flex">
      <button
        onClick={() => showSharedScreen && handleToggleView()}
        className="rounded-md
        cursor-pointer
        rounded-r-none bg-slate-800 py-2 px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-slate-700
        disabled:cursor-not-allowed disabled:opacity-50
        "
        type="button"
        title="Show Shared Screen"
        aria-pressed={showSharedScreen}
        disabled={!showSharedScreen}
      >
        <AiOutlineCode size={24} />
      </button>
      <button
        onClick={() => !showSharedScreen && handleToggleView()}
        className="
        cursor-pointer
        rounded-md rounded-l-none bg-slate-800 py-2 px-4 border border-transparent text-center text-sm text-white transition-all shadow-md hover:shadow-lg focus:bg-slate-700 focus:shadow-none active:bg-slate-700 hover:bg-slate-700 
        disabled:cursor-not-allowed disabled:opacity-50
        "
        type="button"
        title="Show Code Editor"
        aria-pressed={!showSharedScreen}
        disabled={showSharedScreen}
      >
        <AiOutlineDesktop size={24} />{" "}
      </button>
    </div>
  );
}

export default ToggleViewButton;
