import { useState, useEffect } from "react";
import { socket } from "../api/socket";

export default function useHistory(initialState, session) {
  const [history, setHistory] = useState([initialState]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!session) return;

    const handleSetElements = (elements) => {
      setHistory([elements]);
      setIndex(0);
    };

    const handleToolCommand = (command) => {
      if (command.type === "undo") {
        undo(false);
      } else if (command.type === "redo") {
        redo(false);
      } else if (command.type === "clear") {
        setHistory([[]]);
        setIndex(0);
      }
    };

    socket.on("setElements", handleSetElements);
    socket.on("toolCommand", handleToolCommand);

    return () => {
      socket.off("setElements", handleSetElements);
      socket.off("toolCommand", handleToolCommand);
    };
  }, [session]);

  const setState = (action, overwrite = false, emit = true) => {
    const newState =
      typeof action === "function" ? action(history[index]) : action;

    if (session) {
      if (action == "prevState") return;
      setHistory([newState]);
      setIndex(0);

      if (emit) {
        socket.emit("getElements", { elements: newState, room: session });
      }
      return;
    }

    if (action == "prevState") {
      const updatedState = [...history].slice(0, index + 1);
      setHistory([...updatedState, history[index - 1]]);
      setIndex((prevState) => prevState - 1);
      return;
    }

    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updatedState = [...history].slice(0, index + 1);
      setHistory([...updatedState, newState]);
      setIndex((prevState) => prevState + 1);
    }
  };

  const undo = (emit = true) => {
    setIndex((prevState) => {
      const newIndex = prevState > 0 ? prevState - 1 : prevState;
      if (emit && newIndex !== prevState && session) {
        socket.emit("toolCommand", { command: { type: "undo" }, room: session });
      }
      return newIndex;
    });
  };

  const redo = (emit = true) => {
    setIndex((prevState) => {
      const newIndex =
        prevState < history.length - 1 ? prevState + 1 : prevState;
      if (emit && newIndex !== prevState && session) {
        socket.emit("toolCommand", { command: { type: "redo" }, room: session });
      }
      return newIndex;
    });
  };

  const clear = () => {
    setHistory([[]]);
    setIndex(0);
    if (session) {
      socket.emit("toolCommand", { command: { type: "clear" }, room: session });
    }
  };

  return [history[index], setState, undo, redo, clear];
}
