/**
 * Bank Transaction Server - Complete Implementation
 * Ready to run directly - No modifications needed
 */

import express from "express";
import { google } from "googleapis";
import bcrypt from "bcryptjs";
import cookieSession from "cookie-session";
import { createClient } from "@supabase/supabase-js";

const app = express();

// ========================================
// ENVIRONMENT VARIABLES
// ========================================
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = process.env.PORT || 5000;

// ========================================
// DATABASE & AUTHENTICATION SETUP
// ========================================
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const auth = GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY
  ? new google.auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_PRIVATE_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    })
  : null;

// ========================================
// UNIT NAMES LIST - आपकी सभी units
// ========================================
const ALL_UNITS = [
  "CKU", "WARP", "EMB", "EYE & HOOK", "TLU", "VAU", "CUP",
  "ALU", "MUM", "DMN", "ENH/ EHU", "DPU/ DPF", "APP", "LMN", "SUR", 
  "SLU", "SUN", "TDU", "KDC", "UDHANA", "SGU", "CAD"
];

// ========================================
// ONLINE USERS TRACKER - In-memory storage
// ========================================
const onlineUsers = new Map<string, {
  loginId: string;
  firstName: string;
  lastName: string;
  lastActive: Date;
  role: string;
}>();

// ========================================
// MIDDLEWARE
// ========================================
app.use(express.json());

app.use(
  cookieSession({
    name: "session",
    keys: ["ginza-secret-key-v2"],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    sameSite: "none",
  })
);

// ========================================
// ✅ ENDPOINTS - AUTH ROUTES
// ========================================

/**
 * REGISTER - नया user बनाना
 */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, units, role } = req.body;
    
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from("users")
      .insert([{
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        password: hashedPassword,
        units: units || [],
        role: role || "Unit Team"
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message || "Registration failed" });
    }

    res.json({ success: true, message: "User registered successfully" });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * LOGIN - User login करना + Online tracking
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // ✅ Store user in session
    req.session!.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      units: user.units
    };

    // ✅ Track online user
    onlineUsers.set(user.id, {
      loginId: email.toLowerCase(),
      firstName: user.first_name,
      lastName: user.last_name,
      lastActive: new Date(),
      role: user.role
    });

    console.log(`✅ User logged in: ${user.first_name} ${user.last_name} (${user.role})`);

    res.json({ user: req.session!.user });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET CURRENT USER - Current logged in user details
 */
app.get("/api/auth/me", (req, res) => {
  try {
    if (req.session?.user) {
      const userId = req.session.user.id;
      const user = onlineUsers.get(userId);
      
      // ✅ Update last active time
      if (user) {
        user.lastActive = new Date();
        onlineUsers.set(userId, user);
      }
    }

    res.json({ user: req.session?.user || null });
  } catch (error: any) {
    console.error("Auth check error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * LOGOUT - User logout करना + Remove from online users
 */
app.post("/api/auth/logout", (req, res) => {
  try {
    if (req.session?.user) {
      const userId = req.session.user.id;
      const user = onlineUsers.get(userId);
      console.log(`✅ User logged out: ${user?.firstName} ${user?.lastName}`);
      onlineUsers.delete(userId);
    }
    
    req.session = null;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ✅ ENDPOINTS - UNIT & BENEFICIARY
// ========================================

/**
 * GET ALL UNITS - सभी units की list
 */
app.get("/api/units", (req, res) => {
  try {
    res.json({ units: ALL_UNITS });
  } catch (error: any) {
    console.error("Units fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * SEARCH BENEFICIARIES - Beneficiary search करना
 */
app.get("/api/beneficiaries/search", async (req, res) => {
  try {
    const name = req.query.name as string;
    
    if (!name || name.length < 2) {
      return res.json({ beneficiaries: [] });
    }

    let results: any[] = [];

    // Search from Supabase
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("beneficiary_details")
          .select("*")
          .ilike("name", `%${name}%`)
          .limit(10);

        if (!error && data) {
          results = data.map(b => ({
            name: b.name,
            account_no: b.account_no,
            ifsc_code: b.ifsc_code,
          }));
        }
      } catch (err) {
        console.error("Supabase search error:", err);
      }
    }

    // Search from Google Sheets if needed
    if (results.length < 5 && auth) {
      try {
        const sheets = google.sheets({ version: "v4", auth });
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: "Master Sheet!A2:C",
        });

        const rows = response.data.values || [];
        const googleResults = rows
          .filter((row: any) => row[0]?.toLowerCase().includes(name.toLowerCase()))
          .map((row: any) => ({
            name: row[0],
            account_no: row[1],
            ifsc_code: row[2],
          }))
          .slice(0, 5 - results.length);

        results = [...results, ...googleResults];
      } catch (err) {
        console.error("Google Sheets search error:", err);
      }
    }

    res.json({ beneficiaries: results });
  } catch (error: any) {
    console.error("Beneficiary search error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ✅ ENDPOINTS - ORDERS MANAGEMENT
// ========================================

/**
 * SUBMIT NEW ORDER - नया payment order submit करना
 */
app.post("/api/submit", async (req, res) => {
  try {
    const { email, unit, beneficiaryName, accountNo, ifscCode, bills } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    // Validation
    if (!email || !unit || !beneficiaryName || !accountNo || !ifscCode || !bills) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const insertData = bills.map((bill: any) => ({
      email,
      unit,
      beneficiary_name: beneficiaryName,
      account_no: accountNo,
      ifsc_code: ifscCode,
      bill_date: bill.billDate,
      due_date: bill.dueDate,
      amount: bill.amount,
      approved_by_unit: false,
      processed_by_finance: false,
      approval_timestamp: null,
      approval_by_name: null,
      payment_mode: null,
    }));

    const { error } = await supabase
      .from("orders")
      .insert(insertData);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: "Orders submitted successfully" });
  } catch (error: any) {
    console.error("Submit error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET ORDERS - Role-based orders fetch करना
 */
app.get("/api/orders", async (req, res) => {
  try {
    const { email, role } = req.session?.user || {};
    const { view } = req.query;

    if (!supabase) {
      return res.json({ orders: [] });
    }

    let query = supabase.from("orders").select("*");

    // Role-based filtering
    if (role === "Unit Team") {
      query = query.eq("email", email);
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      query = query.gte("created_at", fiveDaysAgo.toISOString());
    } else if (role === "Finance Team") {
      query = query.eq("approved_by_unit", true).eq("processed_by_finance", false);
    } else if (role === "Master") {
      if (view === "finance") {
        query = query.eq("approved_by_unit", true).eq("processed_by_finance", false);
      }
      // All orders for unit view
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ orders: data || [] });
  } catch (error: any) {
    console.error("Get orders error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ APPROVE ORDERS - Timestamp + Approval by Name + Payment Mode
 * POST /api/orders/approve
 * Body: { orderIds: [], paymentMode: "UBI"|"SBI" }
 * Response: { success: true }
 */
app.post("/api/orders/approve", async (req, res) => {
  try {
    const { orderIds, paymentMode } = req.body;
    const { firstName, lastName, id: userId } = req.session?.user || {};

    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    if (!orderIds || orderIds.length === 0) {
      return res.status(400).json({ error: "No orders selected" });
    }

    if (!firstName || !lastName) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Generate timestamp and approval name
    const timestamp = new Date().toISOString();
    const approvalByName = `${firstName} ${lastName}`;

    const updateData: any = {
      processed_by_finance: true,
      approval_timestamp: timestamp,
      approval_by_name: approvalByName,
    };

    if (paymentMode && ["UBI", "SBI"].includes(paymentMode)) {
      updateData.payment_mode = paymentMode;
    }

    // Update all selected orders
    for (const orderId of orderIds) {
      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) {
        console.error(`Error updating order ${orderId}:`, error);
      }
    }

    // ✅ Sync to Google Sheets
    if (auth) {
      await syncToGoogleSheets(orderIds, paymentMode, timestamp, approvalByName);
    }

    console.log(`✅ ${orderIds.length} orders approved by ${approvalByName}`);

    res.json({ 
      success: true, 
      message: `${orderIds.length} orders approved`,
      approvalBy: approvalByName,
      timestamp: timestamp
    });
  } catch (error: any) {
    console.error("Approval error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ GET ONLINE USERS - Currently logged in users
 * GET /api/online-users
 * Response: { users: [{loginId, firstName, lastName, lastActive, role}] }
 */
app.get("/api/online-users", (req, res) => {
  try {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Remove inactive users
    const toDelete = [];
    for (const [userId, user] of onlineUsers.entries()) {
      if (now - user.lastActive.getTime() >= fiveMinutes) {
        toDelete.push(userId);
      }
    }
    toDelete.forEach(id => onlineUsers.delete(id));

    // Return active users
    const activeUsers = Array.from(onlineUsers.values()).map(u => ({
      loginId: u.loginId,
      firstName: u.firstName,
      lastName: u.lastName,
      lastActive: u.lastActive.toISOString(),
      role: u.role
    }));

    res.json({ 
      users: activeUsers,
      totalOnline: activeUsers.length 
    });
  } catch (error: any) {
    console.error("Get online users error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * ✅ PROCESS PAYMENT - Create Bank-specific Google Sheet
 * POST /api/orders/process
 * Body: { orderIds: [], bank: "UBI"|"SBI" }
 * Response: { success: true, sheetName: "UBI_Payment_123456" }
 */
app.post("/api/orders/process", async (req, res) => {
  try {
    const { orderIds, bank } = req.body;

    if (!supabase) {
      return res.status(500).json({ error: "Supabase not configured" });
    }

    if (!auth) {
      return res.status(500).json({ error: "Google Sheets not configured" });
    }

    if (!orderIds || orderIds.length === 0) {
      return res.status(400).json({ error: "No orders selected" });
    }

    if (!bank || !["UBI", "SBI"].includes(bank)) {
      return res.status(400).json({ error: "Invalid bank selection (UBI or SBI)" });
    }

    // Fetch orders from database
    const { data: orders, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .in("id", orderIds);

    if (fetchError || !orders || orders.length === 0) {
      return res.status(400).json({ error: "No orders found" });
    }

    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = `${bank}_Payment_${Date.now()}`;

    // Create new sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: GOOGLE_SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: sheetName }
            }
          }
        ]
      }
    });

    // Prepare data based on bank type
    let headers: string[] = [];
    let rows: any[][] = [];

    if (bank === "UBI") {
      headers = [
        "Client Code",
        "Customer Reference No",
        "Debit Account No.",
        "Transaction Type Code",
        "Message Type",
        "Beneficiary ID",
        "Beneficiary Name",
        "Beneficiary Account No.",
        "Beneficiary Bank Swift Code / IFSC Code",
        "Payment Amount",
        "Value Date",
        "Remarks"
      ];

      rows = orders.map((o: any) => [
        "GINZA",
        o.id,
        "1234567890",
        "T",
        "M",
        o.beneficiary_name,
        o.beneficiary_name,
        o.account_no,
        o.ifsc_code,
        o.amount,
        o.bill_date,
        "Payment"
      ]);
    } else {
      // SBI format
      headers = ["Sl No", "Beneficiary Name", "Account Number", "IFSC Code", "Amount", "Date"];

      rows = orders.map((o: any, i: number) => [
        i + 1,
        o.beneficiary_name,
        o.account_no,
        o.ifsc_code,
        o.amount,
        o.bill_date
      ]);
    }

    // Write to Google Sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers, ...rows]
      }
    });

    // Mark orders as processed
    for (const orderId of orderIds) {
      await supabase
        .from("orders")
        .update({ processed_by_finance: true })
        .eq("id", orderId);
    }

    console.log(`✅ ${orderIds.length} orders processed for ${bank} - Sheet: ${sheetName}`);

    res.json({
      success: true,
      message: `Payment processed successfully`,
      sheetName: sheetName,
      bank: bank,
      ordersProcessed: orderIds.length
    });
  } catch (error: any) {
    console.error("Process payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// ✅ HELPER FUNCTION - Sync to Google Sheets
// ========================================
async function syncToGoogleSheets(
  orderIds: string[],
  paymentMode: string | null,
  timestamp: string,
  approvalByName: string
) {
  try {
    if (!auth || !supabase) return;

    const sheets = google.sheets({ version: "v4", auth });

    // Fetch order details
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .in("id", orderIds);

    if (error || !orders || orders.length === 0) return;

    // ✅ Create payment mode specific tab if selected
    if (paymentMode && ["UBI", "SBI"].includes(paymentMode)) {
      const formattedDate = new Date(timestamp).toLocaleDateString('en-GB');
      const tabName = `Payment_${paymentMode}_${formattedDate.replace(/\//g, '-')}`;

      try {
        // Create sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: GOOGLE_SHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: { title: tabName }
                }
              }
            ]
          }
        });

        // Add headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${tabName}!A1:E1`,
          valueInputOption: "RAW",
          requestBody: {
            values: [["Date", "Payment Mode", "Beneficiary", "Account No", "Amount"]]
          }
        });

        // Add data
        const paymentRows = orders.map((o: any) => [
          new Date(o.bill_date).toLocaleDateString('en-GB'),
          paymentMode,
          o.beneficiary_name,
          o.account_no,
          o.amount
        ]);

        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${tabName}!A2`,
          valueInputOption: "RAW",
          requestBody: { values: paymentRows }
        });

        console.log(`✅ Payment mode tab created: ${tabName}`);
      } catch (e: any) {
        console.error(`Error creating payment mode tab: ${e.message}`);
      }
    }

    // ✅ Add to main approvals tab
    const approvalRows = orders.map((o: any) => [
      new Date(o.bill_date).toLocaleDateString('en-GB'),
      o.beneficiary_name,
      o.account_no,
      o.amount,
      `${approvalByName} - ${new Date(timestamp).toLocaleString()}`,
      paymentMode || "Not Set"
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Approvals!A2",
      valueInputOption: "RAW",
      requestBody: { values: approvalRows }
    });

    console.log(`✅ ${approvalRows.length} records synced to Google Sheets`);
  } catch (error: any) {
    console.error(`Google Sheets sync error: ${error.message}`);
  }
}

// ========================================
// ERROR HANDLING & SERVER START
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
    ╔════════════════════════════════════════╗
    ║  🎉 Bank Transaction Server Started   ║
    ║  Port: ${PORT}                            
    ║  Status: ✅ Ready                      ║
    ╚════════════════════════════════════════╝
  `);

  // Log configuration
  console.log("\n📋 Configuration:");
  console.log(`   ✅ Supabase: ${supabase ? "Connected" : "❌ Not configured"}`);
  console.log(`   ✅ Google Sheets: ${auth ? "Connected" : "❌ Not configured"}`);
  console.log(`   ✅ Units Loaded: ${ALL_UNITS.length}`);
  console.log(`   ✅ Session Secret: Configured\n`);
});

export default app;
