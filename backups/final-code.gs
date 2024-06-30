var TO_ADDRESS = "w_nesbitt@icloud.com"; // email to send the form data to

function doGet(e) {
    if (e.parameter.name) {
        return searchGuests(e.parameter.name);
    } else if (e.parameter.invite_code) {
        return validateInviteCode(e.parameter.invite_code);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Invalid request." }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function searchGuests(name) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('invite_codes');
    var data = sheet.getDataRange().getValues();
    var results = [];
    var searchTerm = name.toLowerCase().trim();

    for (var i = 1; i < data.length; i++) {
        var guestName = data[i][2].toLowerCase();
        if (guestName.includes(searchTerm) || isPartialMatch(guestName, searchTerm)) {
            results.push({ name: data[i][2], guests: data[i][3].split(',') });
        }
    }

    if (results.length > 0) {
        return ContentService.createTextOutput(JSON.stringify({ "result": "success", "data": results }))
            .setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "No matches found." }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function isPartialMatch(fullString, searchString) {
    var fullStringWords = fullString.split(' ');
    var searchStringWords = searchString.split(' ');
    
    for (var i = 0; i < searchStringWords.length; i++) {
        var word = searchStringWords[i];
        var foundMatch = false;
        for (var j = 0; j < fullStringWords.length; j++) {
            if (fullStringWords[j].startsWith(word)) {
                foundMatch = true;
                break;
            }
        }
        if (!foundMatch) {
            return false;
        }
    }
    return true;
}

function validateInviteCode(inviteCode) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('invite_codes');
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (data[i][1] == inviteCode) {
            return ContentService.createTextOutput(JSON.stringify({ "result": "success", "allowedGuests": data[i][4] }))
                .setMimeType(ContentService.MimeType.JSON);
        }
    }
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Invalid invite code." }))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('responses');
    var nextRow = sheet.getLastRow() + 1;
    var data = JSON.parse(e.postData.contents);

    sheet.getRange(nextRow, 1).setValue(new Date());
    sheet.getRange(nextRow, 2).setValue(data.name);

    var guests = data.guests.map(function (guest) {
        return guest.name + ' (' + guest.status + ')';
    }).join(', ');

    sheet.getRange(nextRow, 3).setValue(guests);

    MailApp.sendEmail({
        to: TO_ADDRESS,
        subject: "New RSVP for your event",
        htmlBody: "New RSVP from <b>" + data.name + "</b><br>Guests:<br>" + guests.replace(/, /g, "<br>")
    });

    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
        .setMimeType(ContentService.MimeType.JSON);
}
