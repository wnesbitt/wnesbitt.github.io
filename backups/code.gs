var TO_ADDRESS = "w_nesbitt@icloud.com"; // email to send the form data to

/**
 * This method is the entry point for GET requests to validate invite code.
 */
function doGet(e) {
    try {
        var inviteCode = e.parameter.invite_code;
        var allowedGuests = getAllowedGuests(inviteCode);

        if (allowedGuests === null) {
            return ContentService
                .createTextOutput(JSON.stringify({"result": "error", "message": "Sorry, your invite code is incorrect."}))
                .setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService
            .createTextOutput(JSON.stringify({"result": "success", "allowedGuests": allowedGuests}))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        Logger.log(error);
        return ContentService
            .createTextOutput(JSON.stringify({"result": "error", "message": "Sorry, there is an issue with the server."}))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * This method is the entry point for POST requests to handle RSVP form submission.
 */
function doPost(e) {
    try {
        Logger.log(e); // the Google Script version of console.log see: Class Logger
        
        var mailData = e.parameters; // just create a slightly nicer variable name for the data
        var allowedGuests = getAllowedGuests(mailData.invite_code);
        var extraGuests = parseInt(mailData.extras, 10); // Ensure extraGuests is an integer

        if (allowedGuests === null) {
            return ContentService
                .createTextOutput(JSON.stringify({"result": "error", "message": "Sorry, your invite code is incorrect."}))
                .setMimeType(ContentService.MimeType.JSON);
        }

        if (extraGuests > allowedGuests) {
            return ContentService
                .createTextOutput(JSON.stringify({"result": "error", "message": "Sorry, you can only bring up to " + allowedGuests + " extra guests."}))
                .setMimeType(ContentService.MimeType.JSON);
        }
        
        record_data(e);
        
        MailApp.sendEmail({
            to: TO_ADDRESS,
            subject: "A new guest RSVP'd for your wedding",
            replyTo: String(mailData.email), // This is optional and reliant on your form actually collecting a field named `email`
            htmlBody: formatMailBody(mailData)
        });

        return ContentService    // return json success results
            .createTextOutput(JSON.stringify({"result": "success", "data": JSON.stringify(e.parameters) }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) { // if error return this
        Logger.log(error);
        return ContentService
            .createTextOutput(JSON.stringify({"result": "error", "message": "Sorry, there is an issue with the server."}))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * This method inserts the data received from the html form submission
 * into the sheet. e is the data received from the POST
 */
function record_data(e) {
    Logger.log(JSON.stringify(e)); // log the POST data in case we need to debug it
    try {
        var doc = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = doc.getSheetByName('responses'); // select the responses sheet
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        var nextRow = sheet.getLastRow() + 1; // get next row
        var row = [new Date().toUTCString()]; // first element in the row should always be a timestamp
        // loop through the header columns
        for (var i = 1; i < headers.length; i++) { // start at 1 to avoid Timestamp column
            if (headers[i].length > 0) {
                row.push(e.parameter[headers[i]]); // add data to row
            }
        }
        // more efficient to set values as [][] array than individually
        sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
    } catch (error) {
        Logger.log(error);
        Logger.log(e);
        throw error;
    } finally {
        return;
    }
}

/**
 * This method is just to prettify the email.
 */
function formatMailBody(obj) { // function to spit out all the keys/values from the form in HTML
    var result = "";
    for (var key in obj) { // loop over the object passed to the function
        result += "<h4 style='text-transform: capitalize; margin-bottom: 0'>" + key + "</h4><div>" + obj[key] + "</div>";
        // for every key, concatenate an `<h4 />`/`<div />` pairing of the key name and its value, 
        // and append it to the `result` string created at the start.
    }
    return result; // once the looping is done, `result` will be one long string to put in the email body
}

/**
 * Function to get allowed guests based on the invite code.
 */
function getAllowedGuests(inviteCode) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('invite_codes');
    var data = sheet.getDataRange().getValues();
    Logger.log("Checking invite code: " + inviteCode);

    for (var i = 1; i < data.length; i++) {
        Logger.log("Checking against code: " + data[i][0]);
        if (data[i][0] == inviteCode) {
            Logger.log("Found code: " + data[i][0] + " with allowed guests: " + data[i][1]);
            return data[i][1]; // assuming the allowed guests is in the second column
        }
    }
    return null;
}
