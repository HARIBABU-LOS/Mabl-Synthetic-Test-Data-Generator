# Mabl Synthetic Test Data Generator

A client-side web application that generates synthetic test datasets covering all possible combinations (Cartesian product) of user-defined fields and values, then exports the result as a downloadable `.csv` file.

## Features

- **3-step guided workflow**: input fields → confirm schema → generate & download
- **Cartesian-product engine**: computes every unique combination of all field values
- **Configurable row limit**: generate all combinations or cap at a specific row count
- **Chunked async processing**: keeps the UI responsive even for large datasets
- **Client-side only**: all data stays in the browser — nothing is sent to any server
- **CSV download**: RFC 4180 compliant output with auto-triggered download
- **Hard safety cap**: max 1,000,000 rows to prevent browser memory issues

## Workflow

### Step 1 — Input & Schema Extraction
Enter each field name and its comma-separated possible values. Click **Analyze Schema** to extract and validate the schema.

### Step 2 — Schema Confirmation
Review the extracted schema table. Confirm the field names and values are correct, then click **Confirm Schema & Continue**.

### Step 3 — Combination Count & Limit
The total number of combinations is calculated using the Cartesian product formula:

```
Total = (values in field 1) × (values in field 2) × ... × (values in field N)
```

Choose one of:
- **Option A** — Generate ALL possible combinations
- **Option B** — Cap generation at a specific number of rows

### Step 4 — Generate & Download
The dataset is compiled in chunks (progress shown). Once complete, a `.csv` file is automatically downloaded.

## Usage

Open `index.html` in any modern browser — no build step or server required.

```
open index.html      # macOS
start index.html     # Windows
xdg-open index.html  # Linux
```

Or serve via any static file server:

```bash
npx serve .
# then visit http://localhost:3000
```

## File Structure

```
index.html   — Main application page (3-step SPA)
styles.css   — Application stylesheet
app.js       — Core logic: parsing, Cartesian product, CSV generation, download
README.md    — This file
```

## Example

**Fields:**

| Field | Values |
|-------|--------|
| Browser | Chrome, Firefox, Safari |
| OS | Windows, macOS, Linux |
| Resolution | 1080p, 4K |

**Total combinations:** 3 × 3 × 2 = **18 rows**

**Output CSV:**

```csv
Browser,OS,Resolution
Chrome,Windows,1080p
Chrome,Windows,4K
Chrome,macOS,1080p
...
Safari,Linux,4K
```
