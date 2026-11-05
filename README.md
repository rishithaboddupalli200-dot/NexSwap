# NexSwap — Community Book Marketplace

A responsive marketplace where anyone can discover, list, buy and exchange pre-loved books.

## Requirements
- Node.js 18 or newer
- npm

## Run on Ubuntu
Open Terminal inside the `NexSwap-Professional` folder:

```bash
npm install
npm start
```

Open `http://localhost:5002`.

To use another port:
```bash
PORT=5003 npm start
```

## Features
- Responsive marketplace with book photography and curated sample listings.
- Public registration and login (no student ID required).
- Search, category filtering and price sorting.
- Create and manage book listings.
- Wishlist.
- Purchase/order requests with delivery name, phone number and full address.
- Exchange requests with the book offered in return and an optional message.
- Dashboard for listings, orders, wishlist and incoming/outgoing exchange requests.
- Local JSON storage in `data/db.json` (created automatically).

## Important notes
- This demo stores data locally in a JSON file; it does not use MongoDB.
- Book images are loaded from Unsplash and need an internet connection.
- Orders are requests only: no payment is processed, and sellers coordinate confirmation/delivery.
- Exchange requests are recorded as pending; automatic acceptance, chat, shipping and payment are not implemented.
- For deployment, set a strong `SESSION_SECRET`, use HTTPS, persistent database storage and a production session store.
