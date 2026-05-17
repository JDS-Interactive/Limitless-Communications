# LMA Communications

LMA Communications is an installable Progressive Web Application (PWA) focused on lightweight, secure, peer-to-peer (P2P) WebRTC video communication.

This frontend publication is designed for:
- private invite-only communication sessions,
- direct browser-to-browser encrypted media exchange,
- cross-platform desktop/mobile compatibility,
- and lightweight deployment through GitHub Pages and the Limitless Mobile Applications ecosystem.

---

## Features

- P2P WebRTC video/audio communication
- Invite-only private rooms
- Installable PWA support
- Cross-platform browser compatibility
- Supabase authentication integration
- Realtime signaling architecture
- STUN-based direct peer connection
- Lightweight frontend deployment
- Mobile and desktop support

---

## Technology Stack

- HTML5
- CSS3
- JavaScript (ES Modules)
- WebRTC
- Supabase
- GitHub Pages
- Cloudflare DNS

---

## Security Notice

This frontend application:
- does not store plaintext passwords,
- does not directly manage credential hashing,
- and relies on Supabase Authentication infrastructure for secure account handling.

Media communication occurs directly between peers whenever network conditions permit successful STUN traversal.

---

## Development Status

Current Version:
- V1 STUN-only P2P communications prototype

Future planned features may include:
- TURN fallback relay support
- friend/contact systems
- presence indicators
- screen sharing
- encrypted messaging
- optional subscription features
- LMA unified communications ecosystem integration

---

## Deployment

This frontend is intended for deployment through:
- GitHub Pages
- Cloudflare custom subdomains
- Limitless Mobile Applications infrastructure

---

## Author

Project Architect:
Jared De Santis

Coding Assistance:
OpenAI ChatGPT

---

## Contact

support@limitless-mobile-applications.com