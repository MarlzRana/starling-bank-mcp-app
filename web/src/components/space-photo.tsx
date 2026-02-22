import { useState, useCallback } from "react";
import { useSpacePhoto } from "../hooks/use-image.js";

export function SpacePhoto({
  name,
  accountUid,
  savingsGoalUid,
}: {
  name: string;
  accountUid: string;
  savingsGoalUid: string;
}) {
  const { imageUrl } = useSpacePhoto(accountUid, savingsGoalUid);
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        className="space-card__photo"
        alt={name}
        onError={onError}
      />
    );
  }
  return <div className="space-card__photo-initials">{name[0]}</div>;
}

export function SpaceListPhoto({
  name,
  accountUid,
  savingsGoalUid,
}: {
  name: string;
  accountUid: string;
  savingsGoalUid: string;
}) {
  const { imageUrl } = useSpacePhoto(accountUid, savingsGoalUid);
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);

  if (imageUrl && !failed) {
    return (
      <img
        src={imageUrl}
        className="space-list-item__photo"
        alt={name}
        onError={onError}
      />
    );
  }
  return <div className="space-list-item__photo-initials">{name[0]}</div>;
}
