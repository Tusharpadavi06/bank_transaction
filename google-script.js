/**
 * Ginza Industries Ltd. - Order Entry Script
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code and Save.
 * 4. Click 'Deploy' > 'New Deployment'.
 * 5. Select 'Web App'.
 * 6. Set 'Execute as: Me' and 'Who has access: Anyone'.
 * 7. Click 'Deploy' and authorize permissions.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Target the "Orders_Final" sheet
    var sheet = ss.getSheetByName("Orders_Final");
    
    // If the sheet doesn't exist, create it with headers
    if (!sheet) {
      sheet = ss.insertSheet("Orders_Final");
      sheet.appendRow([
        "Timestamp", 
        "Email", 
        "Unit", 
        "Beneficiary Name", 
        "Account No", 
        "IFSC Code", 
        "Bill Date", 
        "Due Date", 
        "Amount"
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
    }
    
    var timestamp = new Date();
    var rows = [];
    
    if (data.bills && data.bills.length > 0) {
      data.bills.forEach(function(bill) {
        rows.push([
          timestamp,
          data.email,
          data.unit,
          data.beneficiaryName,
          data.accountNo,
          data.ifscCode,
          bill.billDate,
          bill.dueDate,
          bill.amount
        ]);
      });
    }
    
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "success": true, "message": "Data saved to Orders_Final" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "success": false, "error": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Ginza Order Entry Script is Active.");
}
