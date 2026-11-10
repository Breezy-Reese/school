export const SCHOOL = {
  name: 'Havrard International School',
  address: 'P.O. Box 115-90128, Havard',
  phone: '0768378553',
  email: 'harvardhighschool@school.ac.ke',
};
export const PAYMENT_METHODS = [
  {
    id: 'mpesa',
    type: 'mpesa',
    title: 'M-Pesa Paybill',
    paybill: '522533',
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
    bankName: 'KCB',
    accountName: 'Shinestar',
    accountNumber: '7986962',
    branch: 'Mtito Andei',
    note: "Write the student's admission number as the reference.",
  },
  {
    id: 'office',
    type: 'office',
    title: 'Pay at the school',
    details: "Bursar's office, Monday to Friday, 8:00 am to 4:00 pm. Cash, cheque or card accepted.",
  },
];