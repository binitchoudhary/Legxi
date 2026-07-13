import 'dotenv/config';

const SPREADSHEET_ID = '1D6qTb58W9_SREE5pxiHxEgqzHfRZLO9OB-x0e3yHSNA';

async function getColLabels(tab) {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;
  const resp = await fetch(url);
  const text = await resp.text();
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  const data  = JSON.parse(text.slice(start, end + 1));
  const cols  = data.table.cols;
  const rows  = data.table.rows;

  console.log(`\n=== "${tab}" ===`);
  cols.forEach((c, i) => console.log(`  col[${i}] label="${c.label}" type=${c.type}`));

  // Print first 4 rows values
  for (const row of rows.slice(0, 4)) {
    if (!row.c) continue;
    const vals = row.c.map((c, i) => {
      if (!c) return `[${i}]:null`;
      return `[${i}]:v=${JSON.stringify(c.v)} f=${JSON.stringify(c.f)}`;
    });
    console.log('  row:', vals.join(' | '));
  }
}

await getColLabels('AS 02 BALL');
await getColLabels('GOD OF CRICKET');
await getColLabels('RCB ARTWORK');
await getColLabels('2011 WC Artwork');
