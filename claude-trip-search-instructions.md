# Complete Trip Search Instructions for Claude

## Database Search Strategy for Travel Assistant

When a client asks about their trip or you need to find trip information, use this systematic approach:

### **Primary Search Method: TripSummaryView**

The `trip_summary_view` is your main tool for finding trips. It includes all participant names and trip details in one optimized view.

#### **Basic Client Trip Search**
```sql
SELECT * FROM trip_summary_view 
WHERE participant_names LIKE '%[CLIENT_NAME]%'
   OR primary_contact_first_name LIKE '%[CLIENT_NAME]%'
   OR primary_contact_last_name LIKE '%[CLIENT_NAME]%'
ORDER BY start_date DESC
```

#### **Enhanced Trip Search with Multiple Criteria**
```sql
SELECT * FROM trip_summary_view 
WHERE (participant_names LIKE '%[CLIENT_NAME]%' 
       OR primary_contact_first_name LIKE '%[CLIENT_NAME]%'
       OR primary_contact_last_name LIKE '%[CLIENT_NAME]%')
  AND (trip_name LIKE '%[TRIP_KEYWORD]%')
  AND start_date LIKE '%[YEAR]%'
ORDER BY start_date DESC
```

### **Available MCP Database Tools**

#### **1. execute_query** (Most Flexible - Use This First)
```typescript
execute_query({
  query: "SELECT * FROM trip_summary_view WHERE participant_names LIKE ? ORDER BY start_date DESC",
  params: ["%Chisholm%"]
})
```

#### **2. search_clients** (For Initial Client Lookup)
```typescript
search_clients({
  search_term: "Chisholm",
  limit: 10
})
```

#### **3. get_trip** (Once You Have trip_id)
```typescript
get_trip({
  trip_id: 123
})
```

### **Real-World Example: Finding "Chisholm European Vacation 2025"**

#### **Step 1: Search by Client Name**
```typescript
execute_query({
  query: `SELECT trip_id, trip_name, start_date, end_date, status, total_cost, 
                 participant_names, primary_contact_first_name, primary_contact_last_name
          FROM trip_summary_view 
          WHERE participant_names LIKE '%Chisholm%' 
             OR primary_contact_last_name LIKE '%Chisholm%'
          ORDER BY start_date DESC`,
  params: []
})
```

#### **Step 2: If Multiple Results, Refine Search**
```typescript
execute_query({
  query: `SELECT * FROM trip_summary_view 
          WHERE (participant_names LIKE '%Chisholm%' OR primary_contact_last_name LIKE '%Chisholm%')
            AND (trip_name LIKE '%European%' OR trip_name LIKE '%Europe%')
            AND start_date LIKE '%2025%'`,
  params: []
})
```

#### **Step 3: Get Complete Trip Details**
Once you have the trip_id, get full details:
```typescript
get_trip({
  trip_id: [found_trip_id]
})
```

### **Database Schema Reference**

#### **TripSummaryView Columns**
- `trip_id`: Unique identifier
- `trip_name`: Full trip name
- `start_date`, `end_date`: Trip dates (YYYY-MM-DD format)
- `duration`: Trip length
- `trip_status`: 'Planned', 'Booked', 'Completed', 'Cancelled'
- `total_cost`, `currency`: Financial information
- `agent_name`: Travel agent handling the trip
- `participant_names`: **KEY FIELD** - All participants separated by '; '
- `primary_contact_first_name`, `primary_contact_last_name`: Main contact

#### **Key Search Patterns**
- **Client Name**: `participant_names LIKE '%[NAME]%'`
- **Trip Year**: `start_date LIKE '%2025%'`
- **Trip Type**: `trip_name LIKE '%European%'` or `trip_name LIKE '%Cruise%'`
- **Status**: `trip_status = 'Booked'`
- **Agent**: `agent_name LIKE '%[AGENT]%'`

### **Error Handling & Troubleshooting**

#### **Common Database Errors**
1. **"no such column: client_name"** - Use `participant_names` instead
2. **"no such column: booking_reference"** - Use `trip_id` or `trip_name`
3. **Empty Results** - Try broader LIKE patterns with `%` wildcards

#### **Fallback Strategies**
1. **Too Many Results**: Add more specific criteria (dates, trip type)
2. **No Results**: 
   - Try partial name matches: `%Chi%` instead of `%Chisholm%`
   - Search trip_name field: `trip_name LIKE '%2025%'`
   - Check different date formats

#### **Best Practices**
1. **Always use trip_summary_view** for initial searches
2. **Use LIKE with %** for flexible matching
3. **Sort by start_date DESC** to show recent trips first
4. **Include trip_id** in results for follow-up queries
5. **Check participant_names field** - it contains all trip participants

### **Complete Workflow Example**

```typescript
// 1. Initial broad search
execute_query({
  query: "SELECT * FROM trip_summary_view WHERE participant_names LIKE ? ORDER BY start_date DESC",
  params: ["%Chisholm%"]
})

// 2. If needed, refine with additional criteria
execute_query({
  query: `SELECT * FROM trip_summary_view 
          WHERE participant_names LIKE '%Chisholm%' 
            AND trip_name LIKE '%European%' 
            AND start_date >= '2025-01-01'`,
  params: []
})

// 3. Get complete trip details
get_trip({
  trip_id: [found_trip_id]
})

// 4. If trip involves multiple participants, get client details
search_clients({
  search_term: "Chisholm"
})
```

This approach ensures you'll find the trip efficiently and retrieve all necessary details for comprehensive assistance.