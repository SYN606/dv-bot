import React from "react";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function PrivateBotDialog({ open, onClose, guild }) {
  if (!guild) return null;

  return (
    <ConfirmDialog 
      open={open}
      onClose={onClose}
      onConfirm={() => {
        window.open("https://discord.gg/SYN", "_blank");
        onClose();
      }}
      title="Request Digital Vigital"
      description={
        <>
          <p className="mb-4">
            Digital Vigital is currently a private bot. Public installation links are disabled.
          </p>
          <p>
            To request access for <strong className="text-white">{guild.name}</strong>, contact the bot owner.
          </p>
        </>
      }
      confirmText="Contact SYN"
      cancelText="Close"
    />
  );
}
