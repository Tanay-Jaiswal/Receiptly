# Receiptly

Receiptly is a polished, local-first storytelling frontend for household transaction data. It turns a CSV into a gentle receipt-paper visualisation of spending patterns—without accounts, APIs, or personally identifying details.

## Run locally

```bash
npm install
npm run generate:data
npm run dev
```

The data generator reads `Dataset/Daily Household Transactions.csv`, normalises rows, aggregates expense categories, and writes the safe presentation payload to `public/data/receiptly.json`. The app also has a small deterministic fallback so the shell remains useful while data is being generated.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The pure analytics functions in `src/engine` have Vitest coverage for date parsing, expense filtering, and category aggregation.
