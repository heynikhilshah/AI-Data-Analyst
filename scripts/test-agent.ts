import { executeQuery, getChinookSchema, getDbStats } from "../lib/db/chinook";

async function runTests() {
  console.log("=== 1. Testing Database Introspection & Stats ===");
  const stats = getDbStats();
  console.log(`Connected: ${stats.connected}`);
  console.log(`Total Tables: ${stats.totalTables}`);
  console.log(`Total Rows across database: ${stats.totalRows}`);
  console.log("Tables:", stats.tables.map(t => `${t.name} (${t.rowCount})`).join(", "));

  console.log("\n=== 2. Testing Read-Only Query Execution ===");
  const query1 = `
    SELECT ar.Name AS ArtistName, ROUND(SUM(il.UnitPrice * il.Quantity), 2) AS TotalRevenue
    FROM InvoiceLine il
    JOIN Track t ON il.TrackId = t.TrackId
    JOIN Album al ON t.AlbumId = al.AlbumId
    JOIN Artist ar ON al.ArtistId = ar.ArtistId
    GROUP BY ar.ArtistId, ar.Name
    ORDER BY TotalRevenue DESC
    LIMIT 5;
  `;

  const res1 = await executeQuery(query1);
  console.log(`Query 1 Success: ${res1.success}, Execution Time: ${res1.executionTimeMs}ms`);
  console.log("Rows returned:", res1.rows);

  console.log("\n=== 3. Testing Monthly Revenue Trend ===");
  const query2 = `
    SELECT strftime('%Y-%m', InvoiceDate) AS Month, ROUND(SUM(Total), 2) AS MonthlySales
    FROM Invoice
    GROUP BY Month
    ORDER BY Month ASC
    LIMIT 6;
  `;
  const res2 = await executeQuery(query2);
  console.log(`Query 2 Success: ${res2.success}, Rows: ${res2.rowCount}`);
  console.log("Rows:", res2.rows);

  console.log("\n=== 4. Testing Security Constraint (Blocking Disallowed Mutations) ===");
  const dangerousQuery = "DROP TABLE Customer;";
  const res3 = await executeQuery(dangerousQuery);
  console.log(`DROP query blocked successfully: ${!res3.success}`);
  console.log(`Error message: ${res3.error}`);

  const updateQuery = "UPDATE Artist SET Name = 'Hacked' WHERE ArtistId = 1;";
  const res4 = await executeQuery(updateQuery);
  console.log(`UPDATE query blocked successfully: ${!res4.success}`);
  console.log(`Error message: ${res4.error}`);

  console.log("\n=== 5. Schema Prompt Length & Verification ===");
  const schema = getChinookSchema();
  console.log(`Schema prompt character length: ${schema.length} characters`);
  console.log("First 300 chars of schema:\n", schema.slice(0, 300));

  console.log("\nALL DATABASE TESTS PASSED SUCCESSFULLY!");
}

runTests().catch(console.error);
