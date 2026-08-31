import { toast } from "sonner";

/**
 * Standard "not enough money" prompt.
 * Always nudges the user straight to the deposit flow.
 */
export const promptDeposit = (opts?: { needed?: number; balance?: number; context?: string }) => {
  const { needed, balance, context } = opts || {};
  const parts: string[] = [];
  if (typeof needed === "number") parts.push(`You need ₦${needed.toLocaleString()}`);
  if (typeof balance === "number") parts.push(`Balance: ₦${Number(balance).toLocaleString()}`);
  if (context) parts.push(context);

  toast.error("Insufficient balance", {
    description: parts.length ? parts.join(" • ") : "Top up your wallet to continue.",
    action: {
      label: "Deposit",
      onClick: () => {
        window.location.href = "/wallet?deposit=1";
      },
    },
  });
};
