/**
 * Map a money event to an emoji "logo". CSP-strict: we never load remote brand
 * images, so a recognisable emoji stands in. Recognition is keyword-based on the
 * event name (Malaysian + common international merchants), with a per-type
 * fallback. A user-set `emoji` always wins. Pure and deterministic.
 */
import type { EventType, RecurringEvent } from '../model/types';

const TYPE_EMOJI: Record<EventType, string> = {
  income: '💰',
  subscription: '🔁',
  savings: '🐷',
  investment: '📈',
  bnpl: '🛍️',
  creditcard: '💳',
  bill: '🧾',
};

/** [keywords, emoji] — first rule with any matching substring wins. Order: specific → general. */
const RULES: [string[], string][] = [
  // Telco / mobile
  [['maxis', 'hotlink', 'celcom', 'celcomdigi', 'digi', 'u mobile', 'umobile', 'yes 5g', 'telco', 'postpaid', 'prepaid', 't-mobile', 'tmobile', 'at&t', 'verizon', 'vodafone', 'singtel'], '📱'],
  // Home internet
  [['unifi', 'streamyx', 'broadband', 'fibre', 'fiber', 'wifi', 'time internet', 'maxis fibre'], '🛜'],
  // Streaming video / TV
  [['netflix', 'disney', 'hbo', 'hulu', 'prime video', 'apple tv', 'appletv', 'viu', 'iflix', 'astro', 'mubi'], '🎬'],
  // Music
  [['spotify', 'joox', 'apple music', 'youtube music', 'tidal', 'deezer'], '🎵'],
  [['youtube premium', 'youtube'], '▶️'],
  // Cloud storage / productivity / AI
  [['icloud', 'google one', 'dropbox', 'onedrive', 'google storage'], '☁️'],
  [['chatgpt', 'openai', 'claude', 'anthropic', 'notion', 'adobe', 'canva', 'figma', 'github', 'microsoft 365', 'office 365'], '🤖'],
  // Food delivery / coffee / dining / groceries
  [['grabfood', 'foodpanda', 'food panda', 'deliveroo', 'doordash', 'ubereats', 'uber eats'], '🛵'],
  [['starbucks', 'zus coffee', 'gigi coffee', 'coffee', 'kopi', 'cafe'], '☕'],
  [['mcdonald', 'kfc', 'pizza', 'burger', 'subway', 'restaurant', 'makan', 'mamak'], '🍔'],
  [['grocer', 'tesco', 'lotus', 'giant', 'aeon', 'mydin', 'nsk', 'supermarket', 'jaya grocer', 'village grocer', 'econsave'], '🛒'],
  // Transport / fuel / toll / public transit
  [['petronas', 'shell', 'petron', 'caltex', 'bhpetrol', 'petrol', 'fuel', 'diesel', 'minyak'], '⛽'],
  [["touch 'n go", 'touch n go', 'tng ', 'toll', 'smarttag', 'plus highway'], '🛣️'],
  [['grab', 'gojek', 'taxi', 'uber', 'ehailing', 'e-hailing'], '🚗'],
  [['mrt', 'lrt', 'ktm', 'monorail', 'rapidkl', 'rapid kl', 'public transport', 'transit'], '🚆'],
  [['airasia', 'malaysia airlines', 'batik air', 'flight', 'airline', 'firefly'], '✈️'],
  // Housing / utilities
  [['rent', 'rental', 'landlord', 'mortgage', 'housing loan', 'home loan', 'sewa'], '🏠'],
  [['tnb', 'tenaga', 'electric', 'elektrik', 'bil api'], '💡'],
  [['syabas', 'indah water', 'air selangor', 'water bill', 'ranhill', 'pba'], '🚰'],
  [['gas malaysia', 'gas bill', 'lpg'], '🔥'],
  // Insurance / health / fitness
  [['insurance', 'insuran', 'takaful', 'prudential', 'aia', 'great eastern', 'allianz', 'etiqa', 'axa', 'zurich', 'manulife'], '🛡️'],
  [['clinic', 'hospital', 'doctor', 'medical', 'pharmacy', 'guardian', 'watsons', 'caring', 'hims', 'blue shield', 'bluecross', 'klinik'], '🩺'],
  [['dental', 'dentist', 'braces', 'gigi palsu'], '🦷'],
  [['gym', 'fitness', 'celebrity fitness', 'anytime fitness'], '🏋️'],
  // Shopping / e-commerce
  [['shopee', 'lazada', 'zalora', 'amazon', 'taobao', 'aliexpress', 'uniqlo', 'ikea', 'pavilion', 'mid valley'], '🛍️'],
  // BNPL
  [['atome', 'spaylater', 'shopee paylater', 'grab paylater', 'instalment', 'installment', 'hoolah'], '🧾'],
  // Cards / banks
  [['credit card', 'kad kredit', 'maybank', 'cimb', 'public bank', 'rhb', 'hong leong', 'bank islam', 'ambank', 'uob', 'ocbc', 'hsbc', 'standard chartered', 'visa', 'mastercard', 'amex'], '💳'],
  // Savings / fixed deposit
  [['asb', 'asnb', 'tabung haji', 'fixed deposit', 'savings', 'simpanan', 'simpan'], '🐷'],
  // Investing
  [['stashaway', 'wahed', 'versa', 'kdi', 'raiz', 'unit trust', 'etf', 'saham', 'dividend', 'invest', 'crypto', 'bitcoin', 'luno', 'rakuten trade'], '📈'],
  // Income
  [['salary', 'payroll', 'gaji', 'paycheck', 'wage', 'bonus', 'commission', 'freelance', 'invoice', 'refund', 'cashback', 'rebate'], '💰'],
  // Education / family
  [['school', 'tuition', 'college', 'university', 'udemy', 'coursera', 'yuran', 'tadika', 'nursery', 'childcare'], '🎓'],
  [['pet', 'vet', 'kucing', 'anjing'], '🐾'],
];

/** Best emoji for a name + type (ignores any user override). */
export function brandEmoji(name: string, type: EventType): string {
  const n = name.toLowerCase();
  if (n.trim()) {
    for (const [keys, emoji] of RULES) {
      if (keys.some((k) => n.includes(k))) return emoji;
    }
  }
  return TYPE_EMOJI[type];
}

/** Emoji to show for an event — the user override if set, else auto-detected. */
export function eventEmoji(ev: RecurringEvent): string {
  const override = ev.emoji?.trim();
  return override || brandEmoji(ev.name, ev.type);
}
