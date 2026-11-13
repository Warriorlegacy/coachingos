// src/views/FeesView.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Invoice, FeeHead, Student, Receipt } from '../types';
import { apiRequest, formatCurrency, formatDate } from '../lib/api';
import {
  ReceiptText,
  Plus,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  X,
  ShieldCheck,
  Search
} from 'lucide-react';

export const FeesView: React.FC = () => {
  const { role, activeCentre } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<{ description: string; amountCents: number }[]>([
    { description: 'Monthly Tuition Fee', amountCents: 450000 },
  ]);
  const [discountCents, setDiscountCents] = useState('0');
  const [discountReason, setDiscountReason] = useState('');

  // Record Payment Modal
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [paymentAmountCents, setPaymentAmountCents] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('upi_ref');
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [payError, setPayError] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);

  // View Receipt Modal
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

  const canManage = ['centre_owner', 'centre_admin', 'accountant'].includes(role || '');

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, headRes, stuRes] = await Promise.all([
        apiRequest('/fees/invoices'),
        apiRequest('/fees/heads').catch(() => ({ heads: [] })),
        apiRequest('/students').catch(() => ({ students: [] })),
      ]);
      setInvoices(invRes.invoices || []);
      setFeeHeads(headRes.heads || []);
      setStudents(stuRes.students || []);
      if (stuRes.students?.length > 0) {
        setSelectedStudentId(stuRes.students[0].id);
      }
    } catch (err) {
      console.error('Failed to load fees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/fees/invoices', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentId,
          dueDate,
          items: invoiceItems,
          discountCents: Number(discountCents) * 100,
          discountReason,
        }),
      });
      setShowInvoiceModal(false);
      setDiscountCents('0');
      setDiscountReason('');
      await loadData();
    } catch (err: any) {
      alert(`Failed to create invoice: ${err.message}`);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;
    setRecordingPay(true);
    setPayError('');

    try {
      const res = await apiRequest('/fees/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: selectedInvoiceForPay.id,
          amountCents: paymentAmountCents,
          paymentMode,
          referenceNote,
        }),
      });

      setSelectedInvoiceForPay(null);
      await loadData();

      // Offer to view receipt
      if (res.receiptId) {
        const rcpData = await apiRequest(`/fees/receipts/${res.receiptId}`);
        setViewingReceipt(rcpData);
      }
    } catch (err: any) {
      setPayError(err.message || 'Payment recording failed');
    } finally {
      setRecordingPay(false);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoiceForPay(inv);
    setPaymentAmountCents(inv.balance_cents);
    setPaymentMode('upi_ref');
    setReferenceNote('');
    setPayError('');
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <ReceiptText className="h-6 w-6 text-amber-400" />
            <span>Fees, Invoices & Payment Ledger</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Decimal-safe arithmetic (zero floating-point math) • Manual payments & verified receipts
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </button>
        )}
      </div>

      {/* Invoices Ledger Table */}
      <div className="bezel-card p-1.5">
        <div className="bezel-card-inner overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
                {canManage && <th className="px-4 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    No fee invoices recorded.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono font-medium text-sky-400">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {inv.first_name} {inv.last_name}
                      <span className="block text-[10px] font-mono text-zinc-500">{inv.admission_no}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      {formatCurrency(inv.total_cents, activeCentre?.currency)}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">
                      {formatCurrency(inv.paid_cents, activeCentre?.currency)}
                    </td>
                    <td className="px-4 py-3 font-bold text-amber-400">
                      {formatCurrency(inv.balance_cents, activeCentre?.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : inv.status === 'partially_paid'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        {inv.status !== 'paid' ? (
                          <button
                            onClick={() => openPaymentModal(inv)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold"
                          >
                            Record Payment
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-500">Settled</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedInvoiceForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-md">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Record Manual Payment</h3>
                  <p className="text-[11px] text-zinc-400">
                    {selectedInvoiceForPay.invoice_number} • {selectedInvoiceForPay.first_name} {selectedInvoiceForPay.last_name}
                  </p>
                </div>
                <button onClick={() => setSelectedInvoiceForPay(null)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {payError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{payError}</span>
                </div>
              )}

              <form onSubmit={handleRecordPayment} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Amount Received ({activeCentre?.currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    value={paymentAmountCents / 100}
                    onChange={(e) => setPaymentAmountCents(Math.floor(Number(e.target.value) * 100))}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-bold text-emerald-400 text-base"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Outstanding balance: {formatCurrency(selectedInvoiceForPay.balance_cents, activeCentre?.currency)}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
                  >
                    <option value="upi_ref">UPI Reference (GooglePay / PhonePe / Paytm)</option>
                    <option value="cash">Cash Received at Reception</option>
                    <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="cheque">Cheque Deposit</option>
                    <option value="external_card">Card (External POS terminal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Reference / Transaction Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref: 9482710492 or Cash Receipt #14"
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-zinc-400 flex items-start gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span>
                    Notice: This is an internal ledger entry. CoachingOS does not process credit cards or execute live bank debits.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceForPay(null)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordingPay}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-40"
                  >
                    {recordingPay ? 'Recording...' : 'Record Payment & Issue Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-lg bg-zinc-900 border-zinc-700">
            <div className="bezel-card-inner p-6 space-y-6 bg-[#0f0f13]">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-sm font-extrabold text-white">{viewingReceipt.centre?.name}</div>
                  <div className="text-[11px] text-zinc-400">{viewingReceipt.centre?.address || 'India'}</div>
                  <div className="text-[10px] font-mono text-zinc-500">Phone: {viewingReceipt.centre?.phone}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    {viewingReceipt.receipt.receipt_number}
                  </div>
                  <div className="text-[10px] text-zinc-400">{formatDate(viewingReceipt.receipt.issued_at)}</div>
                  <button onClick={() => setViewingReceipt(null)} className="text-zinc-500 hover:text-white mt-1">
                    <X className="h-4 w-4 ml-auto" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Student:</span>
                  <span className="text-white font-semibold">
                    {viewingReceipt.receipt.first_name} {viewingReceipt.receipt.last_name} ({viewingReceipt.receipt.admission_no})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Against Invoice:</span>
                  <span className="text-sky-400 font-mono">{viewingReceipt.receipt.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Payment Mode:</span>
                  <span className="text-zinc-200 uppercase font-mono">{viewingReceipt.receipt.payment_mode}</span>
                </div>
                {viewingReceipt.receipt.reference_note && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Reference:</span>
                    <span className="text-zinc-300 font-mono text-[11px]">{viewingReceipt.receipt.reference_note}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/5 flex justify-between text-base font-extrabold">
                  <span className="text-white">Amount Paid:</span>
                  <span className="text-emerald-400">
                    {formatCurrency(viewingReceipt.receipt.amount_cents, viewingReceipt.centre?.currency)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={printReceipt}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-semibold"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bezel-card p-1.5 w-full max-w-lg">
            <div className="bezel-card-inner p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Generate Fee Invoice</h3>
                <button onClick={() => setShowInvoiceModal(false)} className="text-zinc-400 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Select Student *</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs text-zinc-200"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.admission_no} - {s.grade_level})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-zinc-300">Invoice Items</label>
                  {invoiceItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...invoiceItems];
                          updated[idx].description = e.target.value;
                          setInvoiceItems(updated);
                        }}
                        className="col-span-2 glass-input px-2.5 py-1.5 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        value={item.amountCents / 100}
                        onChange={(e) => {
                          const updated = [...invoiceItems];
                          updated[idx].amountCents = Math.floor(Number(e.target.value) * 100);
                          setInvoiceItems(updated);
                        }}
                        className="glass-input px-2.5 py-1.5 rounded-lg text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Discount ({activeCentre?.currency})</label>
                    <input
                      type="number"
                      value={discountCents}
                      onChange={(e) => setDiscountCents(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">Discount Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Sibling discount / Early bird"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="w-full glass-input px-3 py-2 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInvoiceModal(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20"
                  >
                    Generate Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
