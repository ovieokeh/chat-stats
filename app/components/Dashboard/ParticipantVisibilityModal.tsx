"use client";

import { Eye, EyeOff } from "lucide-react";
import { db } from "../../lib/db";

interface Participant {
  id?: number;
  displayName: string;
  isHidden?: boolean;
  isSystem?: boolean;
}

interface ParticipantVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Participant[] | undefined;
}

export const ParticipantVisibilityModal: React.FC<ParticipantVisibilityModalProps> = ({
  isOpen,
  onClose,
  participants,
}) => {
  return (
    <dialog id="participant_visibility_modal" className="modal modal-bottom sm:modal-middle" open={isOpen}>
      <div className="modal-box p-0 max-w-md bg-base-100">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>
          ✕
        </button>
        <div className="p-6">
          <h3 className="font-bold text-lg mb-4">Participant Visibility</h3>
          <p className="text-sm opacity-70 mb-4">Hidden participants are excluded from all analysis and statistics.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {participants
              ?.filter((p) => !p.isSystem)
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-base-200/50 rounded-xl">
                  <span className={`text-sm font-semibold ${p.isHidden ? "opacity-40" : ""}`}>{p.displayName}</span>
                  <button
                    className="btn btn-xs btn-ghost text-primary"
                    onClick={async () => await db.participants.update(p.id!, { isHidden: !p.isHidden })}
                  >
                    {p.isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {p.isHidden ? "Show" : "Hide"}
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </dialog>
  );
};
