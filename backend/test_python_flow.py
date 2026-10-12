import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.db.chinook import execute_query, get_chinook_schema, get_db_stats

def test_db_layer():
    print("=== Testing Python SQLite Driver & Chinook DB ===")
    stats = get_db_stats()
    assert stats["connected"] is True, "Database should be connected"
    assert stats["totalTables"] == 11, f"Expected 11 tables, got {stats['totalTables']}"
    assert stats["totalRows"] > 2000, f"Expected >2000 rows, got {stats['totalRows']}"
    print(f"✓ Connected to {stats['dbPath']}")
    print(f"✓ Tables: {stats['totalTables']}, Total Rows: {stats['totalRows']}")

    # Test top artists query
    top_artists_sql = """
    SELECT ar.Name AS ArtistName, ROUND(SUM(il.UnitPrice * il.Quantity), 2) AS TotalRevenue
    FROM InvoiceLine il
    JOIN Track t ON il.TrackId = t.TrackId
    JOIN Album al ON t.AlbumId = al.AlbumId
    JOIN Artist ar ON al.ArtistId = ar.ArtistId
    GROUP BY ar.ArtistId, ar.Name
    ORDER BY TotalRevenue DESC
    LIMIT 5;
    """
    res = execute_query(top_artists_sql)
    assert res["success"] is True, f"Query failed: {res.get('error')}"
    assert len(res["rows"]) == 5, f"Expected 5 rows, got {len(res['rows'])}"
    print(f"✓ Query executed in {res['execution_time_ms']}ms. Top artist: {res['rows'][0]['ArtistName']} (${res['rows'][0]['TotalRevenue']})")

    # Test destructive query rejection
    drop_res = execute_query("DROP TABLE Invoice;")
    assert drop_res["success"] is False, "DROP TABLE should be blocked"
    print(f"✓ Blocked destructive query: {drop_res['error']}")

    # Test schema generation
    schema = get_chinook_schema()
    assert "Table: Artist" in schema
    assert "Table: Invoice" in schema
    print(f"✓ Schema generated successfully ({len(schema)} characters)")
    print("\nALL PYTHON DATABASE TESTS PASSED!")

if __name__ == "__main__":
    test_db_layer()
