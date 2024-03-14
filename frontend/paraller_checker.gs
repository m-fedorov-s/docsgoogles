function GetRowIndex(documentId, rowName, props=null) {
  if (props == null) {
    props = PropertiesService.getScriptProperties();
  }
  let index = props.getProperty(documentId + rowName);
  if (index == null) {
    Logger.log("Unknown row " + rowName);
    return -1;
  }
  return Number(index);
}

function GetColumnIndex(documentId, columnName, props=null) {
  if (props == null) {
    props = PropertiesService.getScriptProperties();
  }
  let index = props.getProperty(documentId + columnName);
  if (index == null) {
    Logger.log("Unknown column " + columnName);
    return -1;
  }
  return Number(index);
}

function GetVariantIndex(documentId, teamName, props=null) {
  if (props == null) {
    props = PropertiesService.getScriptProperties();
  }
  let index = props.getProperty(documentId + teamName);
  if (index == null) {
    Logger.log("Unknown team " + teamName);
    return -1;
  }
  return Number(index);
}

function GetCorrectAnswer(document, variantIndex, columnIndex, rowIndex) {
  const documentId = document.getId();
  const rowsCount = Number(PropertiesService.getScriptProperties().getProperty(documentId + "rowsCount"));
  const answerIndex = columnIndex * rowsCount + rowIndex + 2;
  Logger.log("Loading answer for column " + columnIndex + " at row " + rowIndex + " (index=" + answerIndex + "; rowsCount=" + rowsCount + "; variantIndex=" + variantIndex + ")");
  return document.getSheetByName("_ответы").getRange(answerIndex + 1, variantIndex + 3).getValue();
}

function DisplayCheckResult(line, background="", status="", actions=[], message="") {
  line.setNumberFormat("@");
  if (background != "") {
    line.setBackground(background);
  }
  let cell = line.getCell(1, 7);
  cell.setDataValidation(null);
  if (status != "" && (actions.length == 0 || actions.includes(status))) {
    cell.setValue(status);
  }
  if (actions.length > 0) {
    let rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(actions, true)
        .setAllowInvalid(false).build();
    cell.setDataValidation(rule);
  } else {
    cell.setDataValidation(null);
  }
  if (message != "") {
    line.getCell(1, 8).setValue(message);
  }
}

function UpdateProblemScore(document, teamName, eventIndex, rowIndex, columnIndex, score) {
  let resultsheet = document.getSheetByName(teamName);
  if (resultsheet == null) {
    Logger.log("ERROR: Failed to find " + teamName);
    return false;
  }
  let cell = resultsheet.getRange(rowIndex + 3, columnIndex + 2);
  let indexWas = cell.getNote();
  if (indexWas == "" || Number(indexWas) > eventIndex) {
    cell.setNote(eventIndex);
  }
  cell.setValue(score);
  return true;
}

function CheckLine(sheet, index, override, values=null, properties=null, correctAnswer=null, score=null) {
  Logger.log("Cheching row " + index + " of sheet " + sheet.getName());
  if (properties == null) {
    properties = PropertiesService.getScriptProperties();
  }
  const documentId = sheet.getParent().getId();
  let line = sheet.getRange(index, 1, 1, 8);
  if (values == null) {
    values = line.getValues()[0];
  }
  Logger.log("mail=" + values[1] + ", team=" + values[2] + ", column=" + values[3] + ", row=" + values[4] + ", answer=" + values[5]);
  const teamName = values[2];
  const columnIndex = GetColumnIndex(documentId, values[3], props=properties);
  const rowIndex = GetRowIndex(documentId, values[4], props=properties);
  const variantIndex = GetVariantIndex(documentId, teamName, props=properties);
  if (correctAnswer == null) {
    correctAnswer = GetCorrectAnswer(sheet.getParent(), variantIndex, columnIndex, rowIndex);
  }
  const answer = String(values[5]).trim();

  let comment = values[6];
  if (score == null) {
    let gameType = properties.getProperty(documentId + "gameType");
    if (gameType == GAME_ABAKA) {
      score = (rowIndex + 1) * 10;
    } else if (gameType == GAME_ABAKA_TRANSPOSED) {
      score = (columnIndex + 1) * 10;
    } else if (gameType == GAME_KRESTIKI) {
      score = 1;
    } else {
      Logger.log("Warning! Game type " + gameType + " is unknown.");
    }
  }
  let resultsheet = sheet.getParent().getSheetByName(teamName);
  if (resultsheet == null) {
    Logger.log("Failed to find " + teamName);
    DisplayCheckResult(line, backgound="#FF000A", status="", actions=[], message="Команда не найдена!!");
    return;
  }

  let cell = resultsheet.getRange(rowIndex + 3, columnIndex + 2);
  let indexWas = cell.getNote();
  let newer = indexWas == "" || Number(indexWas) >= index;
  if (newer) {
    cell.setNote(index);
  }
  Logger.log("Override: " + override + ", index was " + indexWas + ", index now is " + index + ", score=" + score);

  let secondAnswerPolicy = properties.getProperty(documentId + 'secondAnswerPolicy');
  if (!newer && !override) {
    if (secondAnswerPolicy == SECOND_ANSWER_HIDE) {
      sheet.hideRows(index);
      return;
    } else if (secondAnswerPolicy == SECOND_ANSWER_MARK) {
      DisplayCheckResult(line, background="#FF706A", status="ПОВТОР (не зачтено)", actions=[], message="см строку " + indexWas);
      return;
    } else if (secondAnswerPolicy == SECOND_ANSWER_ALLOW) {
      DisplayCheckResult(line, background="#FFA07A", status="", actions=['Пропустить', 'Верно', 'Неверно'], message="Повторная отправка? (см строку " + indexWas + ")");
      return;
    } else {
      Logger.log("Unknown second answer policy '" + secondAnswerPolicy + "'");
      Error("Bad second answer policy" + secondAnswerPolicy);
    }
  }
  if (!newer && override) {
    Logger.log("Overriding a newer result by an old one.");
  }
  if (comment == "Пропустить") {
    sheet.hideRows(index);
    return;
  }

  // This is the first answer send.
  Logger.log("Expected = '" + correctAnswer + "', got = '" + answer + "', comment = " + comment);
  if (answer.toLowerCase() == String(correctAnswer).trim().toLowerCase() && !comment.startsWith("Неверно") || comment.startsWith("Верно")) {
    Logger.log("Correct")
    cell.setValue(score);
    let msg;
    if (override && !newer) {
      msg = "Верно (предыдущие посылки не учтены)";
    } else {
      msg = "Верно";
    }
    DisplayCheckResult(line, background="#00FF00", status=msg, actions=[], message=correctAnswer);
  } else if (comment.startsWith("Неверно")) {
    Logger.log("Incorrect");
    cell.setValue(0);
    let msg;
    if (override && !newer) {
      msg = "Неверно (предыдущие посылки не учтены)";
    } else {
      msg = "Неверно";
    }
    DisplayCheckResult(line, background="#D0FA58", status=msg, actions=[], message=correctAnswer);
  } else if (IsInteger(answer) && IsInteger(correctAnswer)) {
    Logger.log("Almost shurely incorrect");
    cell.setValue(0);
    DisplayCheckResult(line, background="#E07070", status="Неверно (числа)", actions=[], message=correctAnswer);
  } else if (IsFraction(correctAnswer) && IsFraction(answer)) {
    Logger.log("Comparing fractions");
    let fracCorrect = StringToFraction(correctAnswer);
    let fracGiven = StringToFraction(answer);
    if (fracCorrect.numerator * fracGiven.denominator == fracGiven.numerator * fracCorrect.denominator) {
      cell.setValue(score);
      DisplayCheckResult(line, background="#fff750", status="Верно (дроби)", actions=[], message=correctAnswer);
    } else {
      cell.setValue(0);
      DisplayCheckResult(line, background="#E07070", status="Неверно (дроби)", actions=[], message=correctAnswer);
    }
  } else {
    Logger.log("Waiting for manual check.")
    cell.setValue("⏳");
    DisplayCheckResult(line, background="#FFA500", status="Ожидает проверки", actions=['Неверно', 'Верно'], message=correctAnswer);
  }
}

function CheckNewLine(event) {
  let sheet = event.range.getSheet();
  // Using format "DD.MM.YYYY hh:mm:ss"
  let parts = event.values[0].split(" ");
  let dateParts = parts[0].split(".");
  let timeParts = parts[1].split(":");
  let date = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]), Number(timeParts[0]), Number(timeParts[1]), Number(timeParts[2]));
  let payload = {
    "GameID": sheet.getParent().getId(),
    "Timestamp": date.toISOString(),
    "MailHash": Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, event.values[1])),
    "TeamName": event.values[2],
    "ColumnName": event.values[3],
    "RowName": event.values[4],
    "Answer": event.values[5],
  }
  let options = {
    'method': 'POST',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'validateHttpsCertificates': false,
    'muteHttpExceptions': true,
  };
  let response = UrlFetchApp.fetch(CHECK_A_ENDPOINT, options);
  var checkResult;
  if (!IsHttpOk(response.getResponseCode())) {
    Logger.log("Response with error: code=" + response.getResponseCode() + ", data=" + response.getContentText());
  } else {
    checkResult = JSON.parse(response.getContentText()); 
  }
  let row = event.range.getRow();
  Logger.log("values=" + event.values);
  Logger.log("Got sheet " + sheet.getName() + " at row " + row);
  let properties = PropertiesService.getScriptProperties();
  let values = event.values
  values.push("")
  if (checkResult != null && checkResult.Accepted) {
    Logger.log("Updating scores using server response: " + response.getContentText());
    let documentId = sheet.getParent().getId();
    const columnIndex = GetColumnIndex(documentId, values[3], props=properties);
    const rowIndex = GetRowIndex(documentId, values[4], props=properties);
    let ok = UpdateProblemScore(sheet.getParent(), values[2], row, rowIndex, columnIndex, checkResult.Value);
    let line = sheet.getRange(row, 1, 1, 8);
    if (!ok) {
      DisplayCheckResult(line, backgound="#FF000A", status="", actions=[], message="Команда не найдена");
    } else {
      DisplayCheckResult(line, backgound="#00FF00", status=checkResult.Message, actions=[], message=checkResult.ExpectedAnswer);
    }
  } else if (checkResult != null) {
    CheckLine(sheet, row, null, values=values, properties=properties, correctAnswer=checkResult.ExpectedAnswer, score=checkResult.Value);
  } else {
    CheckLine(sheet, row, null, values=values, properties=properties);
  }
}

function CheckOnEditParallel(event) {
  let sheet = event.range.getSheet();
  const name = sheet.getSheetName();
  let range = event.range;
  let column = range.getColumn();
  let lineIndex = range.getRow();
  let documentId = event.source.getId();
  let properties = PropertiesService.getScriptProperties();
  Logger.log("Sheet=" + name + ", line=" + lineIndex + ", column=" + column + ", value='" + event.value +
             "', range_height=" + range.getHeight() + ", range_width=" + range.getWidth());
  if (name.substring(0, 8) == "Проверка" && column == 7) {
    Logger.log("<Triggered> Check line");   
    CheckLine(sheet, lineIndex, true);
  } else if (name == "_настройки") {
    if (column == 2 && lineIndex == 1 && String(range.getValue()) == "Внести изменения") {
      Logger.log("<Settings> Initializing")
      InitializeParallel(sheet.getParent());
      sheet.getRange(1, 2).setValue("Обновлено");
    } else if (column == 2 && lineIndex == 1) {
      Logger.log("<Settings> Mess (Failed Run?)");
      if (properties.getProperty(documentId + "Restart")) {
        sheet.getRange(1, 2).setValue("Требуется перезапуск");
      } else {
        sheet.getRange(1, 2).setValue("Изменено");
      }
    } else {
      Logger.log("<Settings> Changed");
      properties.setProperty(documentId + "Restart", true);
      sheet.getRange(1, 2).setValue("Требуется перезапуск");
    }
  } else if (name == "Команды") {
    Logger.log("<Teams> Added teams");
    let cell = sheet.getParent().getSheetByName("_настройки").getRange(1, 2);
    if (cell.getValue() != "Требуется перезапуск") {
      cell.setValue("Изменено");
    }
  } else if (name == "_ответы") {
    Logger.log("<Answers> Edited");
    let variants = Math.round(properties.getProperty(documentId + "variants_count"));
    if (range.getValue() == "Перепроверить" && column == variants + 3) {
      let line = sheet.getRange(lineIndex, 1, 1, 2);
      let data = line.getValues()[0];
      RecheckProblem(sheet.getParent(), data[0], data[1]);
      range.setValue("Проверено");
    } else if (lineIndex > 2 && column < variants + 3 && column > 2) {
      let variantIndex = column - 3;
      let columnName = sheet.getRange(lineIndex, 1).getValue();
      let rowName = sheet.getRange(lineIndex, 2).getValue();
      properties.setProperty(documentId + variantIndex + columnName + rowName, range.getValue());
      let payload = {
        "GameID": documentId,
        "Records": [{
          "Variant": variantIndex,
          "Key": {
            "ColumnName": columnName,
            "RowName": rowName,
          },
          "Data": range.getValue(),
        }],
      };
      let options = {
        'method': 'POST',
        'contentType': 'application/json',
        'payload': JSON.stringify(payload),
        'validateHttpsCertificates': false,
        'muteHttpExceptions': true,
      };
      let response = UrlFetchApp.fetch(SET_ANSWERS_ENDPOINT, options);
      if (!IsHttpOk(response.getResponseCode())) {
        Logger.log("Response error: code=" + response.getResponseCode() + ", data=" + response.getContentText());
      }
      Logger.log("Save answer for variant=" + variantIndex + ", " + columnName + ", " + rowName);
      sheet.getRange(lineIndex, variants + 3, 1, 1).setValue("Изменено");
    }
  } else {
    Logger.log("No action");
  }
  if (range.getHeight() > 1) {
    Logger.log("Range height is " + range.getHeight());
    // range.FailAll();
  }
  if (range.getWidth() > 1) {
    Logger.log("Range width is " + range.getWidth());
    // range.FailAll();
  }
}

function RecheckProblem(document, columnName, lineName) {
  let properties = PropertiesService.getScriptProperties();
  let documentId = document.getId();
  Logger.log("Recheck " + columnName + ", " + lineName);
  let variants = Math.round(properties.getProperty(documentId + "variants_count"));
  let correctAnswers = [];
  for (let variantIndex = 0; variantIndex < variants; ++variantIndex) {
    correctAnswers.push(properties.getProperty(documentId + variantIndex + columnName + lineName));
  }
  Logger.log("Correct answers = " + correctAnswers);
  let sheet = document.getSheetByName("Проверка");
  if (sheet.getLastRow() > 1) {
    let lines = sheet.getRange(2,1,sheet.getLastRow() - 1, 8).getValues();
    for (let i = 0; i < lines.length; ++i) {
      let line = lines[i];
      if (line[3] == columnName && line[4] == lineName) {
        let variantIndex = GetVariantIndex(documentId, line[2], props=properties);
        if (line[7] != correctAnswers[variantIndex]) {
          sheet.getRange(i+2, 7).clear();
          CheckLine(sheet, i+2, false, values=null, properties=properties);
        }
      }
    }
  }
}

function RecheckTeams(document, teams=[], startFrom=2) {
  let properties = PropertiesService.getScriptProperties();
  Logger.log("Recheck teams = " + teams);
  let sheet = document.getSheetByName("Проверка");
  if (sheet.getLastRow() > 1) {
    let lines = sheet.getRange(2,1,sheet.getLastRow() - 1, 6).getValues();
    for (let i = startFrom - 2; i < lines.length; ++i) {
      let line = lines[i];
      if (teams.includes(String(line[2]))) {
        CheckLine(sheet, i+2, false, values=null, properties=properties);
      }
    }
  }
}

function CheckAgainFailedLines() {
  let startTime = Date.now();
  let scriptProperties = PropertiesService.getScriptProperties();
  
  // Get documentId
  // let documentId = scriptProperties.getProperty("LinesCheckerTaskId");

  DeleteTimeTriggers();
  let documentId = "1rVavc-bRXOABort1BJgqZ_0qK4r57PwOhkdLgXVHE7Q";
  let document = SpreadsheetApp.openById(documentId);
  let sheet = document.getSheetByName("Проверка");
  let startIndex = Number(scriptProperties.getProperty("LinesCheckerIndex"));
  let lastRow = sheet.getLastRow();
  let MAX_CHANK_SIZE = 1000
  let maxIndex = Math.min(lastRow + 1, startIndex + MAX_CHANK_SIZE);
  // let backgrounds = sheet.getRange(2, 1, sheet.getLastRow() - 1).getBackgrounds().flat();
  let backgrounds = sheet.getRange(startIndex, 1, maxIndex - startIndex).getBackgrounds().flat();
  let notFinished = false;
  let lastChecked = maxIndex - 1;
  if (maxIndex < lastRow) {
    notFinished = true;
  }
  Logger.log("Work started");
  try {
    for (let i = startIndex; i < maxIndex; ++i) {
      let currTime = Date.now();
      if(currTime - startTime >= MAX_RUNNING_TIME) {
        notFinished = true;
        lastChecked = i - 1;
        Logger.log("Execution paused after " + (currTime - startTime) + " milliseconds.");
        break;
      } else {
        if (backgrounds[i-startIndex] == "#ffffff" || backgrounds[i-startIndex] == "#ffa500") {
          CheckLine(sheet, i, null, values=null, properties=scriptProperties);
        }
      }
    }
  } catch (error) {
    Logger.log("Got error:" + error);
    notFinished = true;
    lastChecked = startIndex;
  }
  if (notFinished) {
      Logger.log("Progress: " + lastChecked + " out of " + lastRow);
      scriptProperties.setProperty("LinesCheckerIndex", lastChecked + 1);
      ScriptApp.newTrigger("CheckAgainFailedLines")
      .timeBased()
      .after(REASONABLE_TIME_TO_WAIT)
      .create();
      Logger.log("Trigger created");
  }
}
