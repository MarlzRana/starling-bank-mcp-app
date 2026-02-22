import { useEffect, useRef } from "react";
import { useCallTool } from "../helpers.js";

// Module-level caches to avoid refetching across component instances
const profileImageCache = new Map<string, string | null>();
const payeeImageCache = new Map<string, string | null>();
const spacePhotoCache = new Map<string, string | null>();

export function useProfileImage(accountHolderUid: string | undefined): {
  imageUrl: string | null;
  isLoading: boolean;
} {
  const { data, isPending, callTool } = useCallTool("get-profile-image");
  const fired = useRef(false);

  useEffect(() => {
    if (!accountHolderUid || fired.current) return;
    if (profileImageCache.has(accountHolderUid)) return;
    fired.current = true;
    callTool({ accountHolderUid });
  }, [accountHolderUid, callTool]);

  // Extract from response
  const fetched = (
    data?.structuredContent as { dataUri: string | null } | undefined
  )?.dataUri ?? null;

  if (fetched && accountHolderUid) {
    profileImageCache.set(accountHolderUid, fetched);
  }

  const cached = accountHolderUid
    ? profileImageCache.get(accountHolderUid) ?? null
    : null;

  return {
    imageUrl: cached ?? fetched,
    isLoading: !cached && !fetched && isPending,
  };
}

export function usePayeeImage(payeeUid: string): {
  imageUrl: string | null;
  isLoading: boolean;
} {
  const { data, isPending, callTool } = useCallTool("get-payee-image");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (payeeImageCache.has(payeeUid)) return;
    fired.current = true;
    callTool({ payeeUid });
  }, [payeeUid, callTool]);

  const fetched = (
    data?.structuredContent as { dataUri: string | null } | undefined
  )?.dataUri ?? null;

  if (fetched) {
    payeeImageCache.set(payeeUid, fetched);
  }

  const cached = payeeImageCache.get(payeeUid) ?? null;

  return {
    imageUrl: cached ?? fetched,
    isLoading: !cached && !fetched && isPending,
  };
}

export function useSpacePhoto(
  accountUid: string,
  savingsGoalUid: string
): {
  imageUrl: string | null;
  isLoading: boolean;
} {
  const cacheKey = `${accountUid}:${savingsGoalUid}`;
  const { data, isPending, callTool } = useCallTool("get-space-photo");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (spacePhotoCache.has(cacheKey)) return;
    fired.current = true;
    callTool({ accountUid, savingsGoalUid });
  }, [accountUid, savingsGoalUid, cacheKey, callTool]);

  const fetched = (
    data?.structuredContent as { dataUri: string | null } | undefined
  )?.dataUri ?? null;

  if (fetched) {
    spacePhotoCache.set(cacheKey, fetched);
  }

  const cached = spacePhotoCache.get(cacheKey) ?? null;

  return {
    imageUrl: cached ?? fetched,
    isLoading: !cached && !fetched && isPending,
  };
}
