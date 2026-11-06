export const SCHOOL = {
  name: 'Your School Name',
  address: 'P.O. Box 000-00000, Town',
  phone: '0700 000 000',
  email: 'info@yourschool.ac.ke',
};
export const PAYMENT_METHODS = [
  {
    id: 'mpesa',
    type: 'mpesa',
    title: 'M-Pesa Paybill',
    paybill: '000000',
    steps: [
      'Go to M-Pesa, then Lipa na M-Pesa, then Pay Bill.',
      'Enter the Business Number shown here.',
      "Enter the student's admission number as the Account Number.",
      'Enter the amount and your M-Pesa PIN.',
    ],
  },
  {
    id: 'bank',
    type: 'bank',
    title: 'Bank deposit or transfer',
    bankName: 'Your Bank',
    accountName: 'Your School Name',
    accountNumber: '0000000000',
    branch: 'Town Branch',
    note: "Write the student's admission number as the reference.",
  },
  {
    id: 'office',
    type: 'office',
    title: 'Pay at the school',
    details: "Bursar's office, Monday to Friday, 8:00 am to 4:00 pm. Cash, cheque or card accepted.",
  },
];