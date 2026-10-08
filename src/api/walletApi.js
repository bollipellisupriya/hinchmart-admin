import api from "./axios";
import { dispatchDataUpdate } from "./dataStore";

/**
 * 5. Admin Manual Wallet Credit / Adjustment
 * Source: WalletController.java | POST /api/wallet/topup
 * Strictly protected by @PreAuthorize("hasRole('ADMIN')")
 * Body: { amount: 2500.00, description: "Compensation for delayed delivery..." }
 */
export const topupCustomerWallet = async ({
  amount,
  description = "",
  customerId = null,
} = {}) => {
  const numericAmount = Number(amount) || 0;
  const payload = {
    amount: numericAmount,
    description: description?.trim() || "Admin authorized wallet top-up",
  };

  if (customerId) {
    payload.customerId = customerId;
  }

  const res = await api.post("/wallet/topup", payload);
  const data = res.data?.data || res.data;

  dispatchDataUpdate("wallet", "TOPUP", {
    ...payload,
    response: data,
  });

  return data;
};

export default {
  topupCustomerWallet,
};
