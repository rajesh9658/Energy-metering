import React from "react";
import HistoryListScreen, { HistoryMode } from "./components/HistoryListScreen";

const historyModes: HistoryMode[] = [
  {
    key: "transaction",
    label: "Transaction",
    title: "Transaction History",
    subtitle: "Track recharge payments, current status, and credited amounts in one place.",
    accentColor: "#2563EB",
    badgeLabel: "PAYMENTS",
    icon: "card-outline",
    sectionTitle: "Payments",
    filterOptions: ["All", "Success", "Pending", "Failed"],
    records: [
      { id: "txn-1", title: "Recharge via UPI", subtitle: "Balance top-up completed successfully", amount: "Rs 1,000.00", date: "07 Jul 2026, 11:10 AM", status: "Success", month: "Jul 2026", meta: "UPI • TXN43821" },
      { id: "txn-2", title: "Recharge via Card", subtitle: "Payment is still under bank confirmation", amount: "Rs 2,500.00", date: "05 Jul 2026, 08:40 PM", status: "Pending", month: "Jul 2026", meta: "Card • TXN43102" },
      { id: "txn-3", title: "Recharge via Wallet", subtitle: "Recharge attempt could not be completed", amount: "Rs 500.00", date: "28 Jun 2026, 05:05 PM", status: "Failed", month: "Jun 2026", meta: "Wallet • TXN41770" },
      { id: "txn-4", title: "Quick Recharge", subtitle: "Amount credited to prepaid meter", amount: "Rs 3,000.00", date: "17 Jun 2026, 09:25 AM", status: "Success", month: "Jun 2026", meta: "UPI • TXN40291" },
      { id: "txn-5", title: "Monthly Top-Up", subtitle: "Scheduled recharge received on account", amount: "Rs 4,000.00", date: "30 May 2026, 01:15 PM", status: "Success", month: "May 2026", meta: "Net Banking • TXN38944" },
    ],
  },
  {
    key: "deduction",
    label: "Deduction",
    title: "Deduction History",
    subtitle: "Review balance deductions by energy, fixed charge, DG usage, and adjustments.",
    accentColor: "#DC2626",
    badgeLabel: "DEDUCTIONS",
    icon: "receipt-outline",
    sectionTitle: "Deductions",
    filterOptions: ["All", "Energy", "Fixed", "DG", "Adjustment"],
    records: [
      { id: "ded-1", title: "Energy Usage Charge", subtitle: "Automatic deduction for daily unit consumption", amount: "Rs 128.40", date: "07 Jul 2026, 06:00 AM", status: "Energy", month: "Jul 2026", meta: "Consumed 18.6 kWh" },
      { id: "ded-2", title: "Fixed Meter Charge", subtitle: "Recurring fixed service deduction", amount: "Rs 35.00", date: "01 Jul 2026, 12:05 AM", status: "Fixed", month: "Jul 2026", meta: "Monthly fixed component" },
      { id: "ded-3", title: "DG Usage Charge", subtitle: "Deduction applied for backup power usage", amount: "Rs 64.75", date: "22 Jun 2026, 07:40 PM", status: "DG", month: "Jun 2026", meta: "DG runtime 2.4 hrs" },
      { id: "ded-4", title: "Energy Usage Charge", subtitle: "Deduction synced after meter reading update", amount: "Rs 142.20", date: "18 Jun 2026, 06:10 AM", status: "Energy", month: "Jun 2026", meta: "Consumed 20.1 kWh" },
      { id: "ded-5", title: "Service Adjustment", subtitle: "Administrative deduction processed by system", amount: "Rs 20.00", date: "30 May 2026, 03:30 PM", status: "Adjustment", month: "May 2026", meta: "Support verified adjustment" },
    ],
  },
];

export default function HistoryScreen() {
  return <HistoryListScreen modes={historyModes} initialModeKey="transaction" />;
}
