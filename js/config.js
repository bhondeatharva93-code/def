/* ==========================================================================
   Store settings
   Edit WHATSAPP_NUMBER once below to update every WhatsApp link across the site.
   ========================================================================== */
const WHATSAPP_NUMBER = '919000000000';

window.PCS = window.PCS || {};
PCS.WHATSAPP_NUMBER = WHATSAPP_NUMBER;

PCS.config = {
  name: 'YourBrand',
  tagline: 'Gaming, editing, trading and office PCs, built and delivered.',

  phone: '+91 90000 00000',
  phoneTel: '+' + WHATSAPP_NUMBER,
  whatsapp: WHATSAPP_NUMBER,
  email: 'hello@yourbrand.example',
  address: ['12 Example Road, Sample Nagar', 'Your City, Your State 000000'],
  mapsUrl: 'https://maps.google.com/',
  hours: 'Every day, 10 AM to 6 PM',

  social: [
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/' },
    { name: 'YouTube', icon: 'youtube', url: 'https://www.youtube.com/' },
    { name: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/' },
    { name: 'X', icon: 'xsocial', url: 'https://x.com/' }
  ],

  currency: { locale: 'en-IN', code: 'INR' },
  gstPercent: 18,
  shipping: { freeAbove: 5000, flat: 199 },
  emi: { tenures: [3, 6, 9, 12], annualInterestPct: 0 },

  ticker: [
    'EMI on every PC',
    'Delivery across India',
    'GST invoice on every order',
    'Stress-tested before dispatch'
  ],

  commitments: [
    { icon: 'bolt', title: 'Stress-tested', text: 'Every PC runs a full load test before it is packed.' },
    { icon: 'box', title: 'Damage-proof packing', text: 'Foam and a double box for the courier trip.' },
    { icon: 'card', title: 'EMI options', text: 'Split the cost over 3 to 12 months.' },
    { icon: 'shield', title: 'Genuine parts', text: 'Brand warranty on every part, with help on claims.' },
    { icon: 'receipt', title: 'GST invoice', text: 'Invoices for business and bulk orders.' },
    { icon: 'chat', title: 'Real people', text: 'Ask on WhatsApp before you buy and after.' }
  ],

  testSheet: [
    ['CPU load test, 30 minutes', 'Passed'],
    ['GPU load test, 30 minutes', 'Passed'],
    ['Memory test', 'Passed'],
    ['SSD health check', 'Passed'],
    ['Fans and lighting', 'Passed'],
    ['Cable routing', 'Checked']
  ],

  steps: [
    { icon: 'cart', title: 'Order', text: 'Order online, or confirm on WhatsApp.' },
    { icon: 'wrench', title: 'Assembly', text: 'Parts go in with tidy cable routing.' },
    { icon: 'bolt', title: 'Stress test', text: 'Heat, stability and speed are checked.' },
    { icon: 'box', title: 'Packing', text: 'Foam, straps and a second box.' },
    { icon: 'truck', title: 'Delivery', text: 'A tracked courier brings it to you.' }
  ],

  faq: [
    { q: 'Do you deliver across India?', a: 'Yes. We ship with tracked couriers and damage-proof packing. Delivery time depends on your pincode and is shown at checkout.' },
    { q: 'Can I pay in EMI?', a: 'Yes. Credit card EMI and no-card EMI options are available on most PCs. Tenure and approval depend on your bank or EMI partner.' },
    { q: 'Can I change the parts in a prebuilt PC?', a: 'Yes. Message us on WhatsApp with what you want to change, or use the custom build page to pick every part yourself.' },
    { q: 'How does the warranty work?', a: 'Parts carry the brand warranty. If something fails, contact us with your invoice and we will guide you through the claim.' },
    { q: 'What is your return policy?', a: 'Replace this answer with your own return and refund rules, and link to the full policy page.' },
    { q: 'Can I visit the store?', a: 'Yes. See the address and opening hours at the bottom of this page.' },
    { q: 'Do you give a GST invoice?', a: 'Yes. Add your GST number at checkout. For office or bulk orders, message us on WhatsApp for a quote.' }
  ],

  assistant: {
    enabled: true,
    name: 'PC advisor',
    greeting: 'Hi! Tell me what you will use your PC for and your budget, and I will suggest the best options from our store.',
    endpoint: '/api/assistant'
  }
};
