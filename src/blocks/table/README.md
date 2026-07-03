# table

Hairline data table. Header row is mono 2xs uppercase on the surface tint;
first column reads as the row label.

| Field | Type | Notes |
| --- | --- | --- |
| `columns` | string[] | Header cells (≤50) |
| `rows` | string[][] | Body rows; each row is an array of cell strings |

```json
{
  "columns": ["Name", "Detail", "Status"],
  "rows": [["Item one", "First detail", "Active"]]
}
```
