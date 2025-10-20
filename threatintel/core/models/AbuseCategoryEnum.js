// Definizione enum categorie AbuseIPDB
const AbuseCategoryEnum = Object.freeze({
  DNS_COMPROMISE: 1,
  DNS_POISONING: 2,
  FRAUD_ORDERS: 3,
  DDOS_ATTACK: 4,
  FTP_BRUTE_FORCE: 5,
  PING_OF_DEATH: 6,
  PHISHING: 7,
  FRAUD_VOIP: 8,
  OPEN_PROXY: 9,
  WEB_SPAM: 10,
  EMAIL_SPAM: 11,
  BLOG_SPAM: 12,
  VPN_IP: 13,
  PORT_SCAN: 14,
  HACKING: 15,
  SQL_INJECTION: 16,
  SPOOFING: 17,
  BRUTE_FORCE: 18,
  BAD_WEB_BOT: 19,
  EXPLOITED_HOST: 20,
  WEB_APP_ATTACK: 21,
  SSH: 22,
  IOT_TARGETED: 23,
});

// Mappa descrizioni (opzionale per accesso facile)
const AbuseCategoryDescriptions = {
  1: "Altering DNS records resulting in improper redirection.",
  2: "Falsifying domain server cache (cache poisoning).",
  3: "Fraudulent orders.",
  4: "Participating in distributed denial-of-service (usually part of botnet).",
  5: "FTP Brute-Force",
  6: "Oversized IP packet.",
  7: "Phishing websites and/or email.",
  8: "Fraud VoIP",
  9: "Open proxy, open relay, or Tor exit node.",
  10:"Comment/forum spam, HTTP referer spam, or other CMS spam.",
  11:"Spam email content, infected attachments, and phishing emails. Limit comments to relevant information and remove PII for anonymity.",
  12:"CMS blog comment spam.",
  13:"Conjunctive category.",
  14:"Scanning for open ports and vulnerable services.",
  15:"Hacking",
  16:"Attempts at SQL injection.",
  17:"Email sender spoofing.",
  18:"Credential brute-force attacks on webpage logins and services like SSH, FTP, SIP, SMTP, RDP, etc.",
  19:"Webpage scraping and crawlers that ignore robots.txt. Excessive requests and user agent spoofing.",
  20:"Host likely infected with malware used for attacks or hosting malicious content.",
  21:"Attempts to probe for or exploit installed web applications like CMS, e-commerce, forum software etc.",
  22:"Secure Shell (SSH) abuse.",
  23:"Abuse targeted at Internet of Things (IoT) devices.",
};

module.exports = {
  AbuseCategoryEnum,
  AbuseCategoryDescriptions
};