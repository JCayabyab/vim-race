import React from "react";
import ReactModal from "react-modal";

export default function Modal({ isOpen, onRequestClose, children }) {
  const style = {
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    content: {
      position: "static",
      backgroundColor: "#212121",
      border: "1px solid black",
      borderRadius: "3px",
      minWidth: "600px"
    },
  };
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      ariaHideApp={false}
      style={style}
    >
      {children}
    </ReactModal>
  );
}
