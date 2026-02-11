
export async function loadUserDashboardSummary(user, supabase, setTextIfExists) {
  try {
    const txCountEl = document.getElementById("transaction-count");
    const pendingEl = document.getElementById("pending-email-count");
    const inlineEl = document.getElementById("inline-position");

    if (!txCountEl && !pendingEl && !inlineEl) return;

    const { data: userTransactions, error: userTxError } = await supabase
      .from("transactions")
      .select("transaction_id,status,date_time,user_id")
      .eq("user_id", user.user_id)
      .order("date_time", { ascending: false });

    let totalTransactions = 0;
    let pendingCount = 0;

    if (!userTxError && userTransactions) {
      totalTransactions = userTransactions.length;
      pendingCount = userTransactions.filter(
        (tx) => tx.status === "Pending"
      ).length;
    }

    if (txCountEl) txCountEl.textContent = String(totalTransactions);
    if (pendingEl) pendingEl.textContent = String(pendingCount);

   
    let inlineText = "-";
    const { data: pendingQueue, error: pendingError } = await supabase
      .from("transactions")
      .select("transaction_id,user_id,status,date_time")
      .eq("status", "Pending")
      .order("date_time", { ascending: true });

    if (!pendingError && pendingQueue && pendingQueue.length > 0) {
      const userPending = pendingQueue.filter(
        (tx) => tx.user_id === user.user_id
      );
      if (userPending.length > 0) {
        const latestUserPending =
          userPending[userPending.length - 1];
        const indexInQueue = pendingQueue.findIndex(
          (tx) => tx.transaction_id === latestUserPending.transaction_id
        );
        if (indexInQueue !== -1) {
          inlineText = `#${indexInQueue + 1}`;
        }
      }
    }

    if (inlineEl) inlineEl.textContent = inlineText;
  } catch (err) {
    console.error("Error loading user dashboard summary:", err);
  }
}

