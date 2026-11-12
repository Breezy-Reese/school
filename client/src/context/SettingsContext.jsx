import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import { SCHOOL, PAYMENT_METHODS } from '../config';

const DEFAULT_FOOTER = 'Thank you. Fees paid are not refundable.';
const MPESA_STEPS = [
  'Go to M-Pesa, then Lipa na M-Pesa, then Pay Bill.',
  'Enter the Business Number shown here.',
  "Enter the student's admission number as the Account Number.",
  'Enter the amount and your M-Pesa PIN.',
];

// Payment options as set up in config.js. Used until an admin saves Settings for the first time.
function fromConfig() {
  const m = (type) => PAYMENT_METHODS.find((x) => x.type === type);
  return {
    mpesa: { enabled: !!m('mpesa'), paybill: m('mpesa')?.paybill || '' },
    bank: {
      enabled: !!m('bank'),
      bankName: m('bank')?.bankName || '',
      accountName: m('bank')?.accountName || '',
      accountNumber: m('bank')?.accountNumber || '',
      branch: m('bank')?.branch || '',
      note: m('bank')?.note || "Write the student's admission number as the reference.",
    },
    office: { enabled: !!m('office'), details: m('office')?.details || '' },
  };
}

// Turns the saved settings into the list the parent portal displays
function buildMethods(p) {
  const out = [];
  if (p.mpesa?.enabled && p.mpesa.paybill) {
    out.push({ id: 'mpesa', type: 'mpesa', title: 'M-Pesa Paybill', paybill: p.mpesa.paybill, steps: MPESA_STEPS });
  }
  if (p.bank?.enabled && p.bank.accountNumber) {
    out.push({
      id: 'bank', type: 'bank', title: 'Bank deposit or transfer',
      bankName: p.bank.bankName || '-', accountName: p.bank.accountName || '-',
      accountNumber: p.bank.accountNumber, branch: p.bank.branch || '-', note: p.bank.note,
    });
  }
  if (p.office?.enabled && p.office.details) {
    out.push({ id: 'office', type: 'office', title: 'Pay at the school', details: p.office.details });
  }
  return out;
}

const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      setData(res.data);
    } catch { /* keep the config.js defaults */ }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    if (user) reload();
    else { setData(null); setLoaded(false); }
  }, [user, reload]);

  // Saved values win; blanks fall back to config.js
  const saved = data?.school || {};
  const school = {
    ...SCHOOL,
    receiptFooter: DEFAULT_FOOTER,
    ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => k !== 'receiptFooter' && v)),
    ...(typeof saved.receiptFooter === 'string' ? { receiptFooter: saved.receiptFooter } : {}),
  };

  const paymentSettings = data?.configured ? data.payment : fromConfig();
  const paymentMethods = data?.configured ? buildMethods(data.payment) : PAYMENT_METHODS;

  return (
    <SettingsContext.Provider value={{ school, paymentSettings, paymentMethods, loaded, reload }}>
      {children}
    </SettingsContext.Provider>
  );
}