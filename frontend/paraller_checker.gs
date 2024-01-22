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

function CheckLine(sheet, index, override, values=null, properties=null) {
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
  let correctAnswer = properties.getProperty(documentId + variantIndex + values[3] + values[4]);
  if (correctAnswer == null) {
    correctAnswer = GetCorrectAnswer(sheet.getParent(), variantIndex, columnIndex, rowIndex);
    properties.setProperty(documentId + variantIndex + values[3] + values[4], correctAnswer);
  }
  const answer = String(values[5]).trim();

  let comment = values[6];
  let score;
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
  let resultsheet = sheet.getParent().getSheetByName(teamName);
  if (resultsheet == null) {
    Logger.log("Failed to find " + teamName);
    line.setBackground("#FF000A");
    line.getCell(1, 8).setValue("Команда не найдена!!");
    return;
  }

  let cell = resultsheet.getRange(rowIndex + 3, columnIndex + 2);
  let indexWas = cell.getNote();
  let newer = indexWas == "" || Number(indexWas) >= index;
  if (newer) {
    cell.setNote(index);
  }
  Logger.log("Override: " + override + ", index was " + indexWas + ", index now is " + index + ", score=" + score + ", gameType=" + gameType);

  let secondAnswerPolicy = properties.getProperty(documentId + 'secondAnswerPolicy');
  if (!newer && !override) {
    if (secondAnswerPolicy == SECOND_ANSWER_HIDE) {
      sheet.hideRows(index);
      return;
    } else if (secondAnswerPolicy == SECOND_ANSWER_MARK) {
      line.setBackground("#FF706A");
      line.getCell(1, 7).setDataValidation(null)
                        .setValue("ПОВТОР (не зачтено)");
      line.getCell(1, 8).setValue("см строку " + indexWas);
      return;
    } else if (secondAnswerPolicy == SECOND_ANSWER_ALLOW) {
      Logger.log("There is something in the result cell already..")
      line.setBackground("#FFA07A");
      let rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Пропустить', 'Верно', 'Неверно'], true)
        .setAllowInvalid(false).build();
      line.getCell(1, 7).setDataValidation(rule);
      line.getCell(1, 8).setValue("Повторная отправка? (см строку " + indexWas + ")");
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
    line.setBackground("#00FF00")
        .setNumberFormat("@").getCell(1, 7)
                             .setDataValidation(null)
                             .setValue(msg);
    line.getCell(1, 8).setNumberFormat("@").setValue(correctAnswer);
  } else if (comment.startsWith("Неверно")) {
    Logger.log("Incorrect");
    cell.setValue(0);
    let msg;
    if (override && !newer) {
      msg = "Неверно (предыдущие посылки не учтены)";
    } else {
      msg = "Неверно";
    }
    line.setBackground("#D0FA58")
        .setNumberFormat("@").getCell(1, 7)
                             .setDataValidation(null)
                             .setValue(msg);
    line.getCell(1, 8).setNumberFormat("@").setValue(correctAnswer);
  } else if (IsInteger(answer) && IsInteger(correctAnswer)) {
    Logger.log("Almost shurely incorrect");
    cell.setValue(0);
    line.setBackground("#E07070")
        .setNumberFormat("@").getCell(1, 7)
                             .setDataValidation(null)
                             .setValue("Неверно (числа)");
    line.getCell(1, 8).setNumberFormat("@").setValue(correctAnswer);
  } else if (IsFraction(correctAnswer) && IsFraction(answer)) {
    Logger.log("Comparing fractions");
    let fracCorrect = StringToFraction(correctAnswer);
    let fracGiven = StringToFraction(answer);
    if (fracCorrect.numerator * fracGiven.denominator == fracGiven.numerator * fracCorrect.denominator) {
      cell.setValue(score);
      line.setBackground("#fff750")
          .setNumberFormat("@").getCell(1, 7)
                               .setDataValidation(null)
                               .setValue("Верно (дроби)");
      line.getCell(1, 8).setNumberFormat("@").setValue(correctAnswer);
    } else {
      cell.setValue(0);
      line.setBackground("#E07070")
          .setNumberFormat("@").getCell(1, 7)
                               .setDataValidation(null)
                               .setValue("Неверно (дроби)");
      line.getCell(1, 8).setNumberFormat("@").setValue(correctAnswer);
    }
  } else {
    Logger.log("Waiting for manual check.")
    cell.setValue("⏳");

    line.setBackground("#FFA500")
        .setNumberFormat("@").getCell(1, 8)
                             .setNumberFormat("@")
                             .setValue(correctAnswer);
    let rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Неверно', 'Верно'], true)
        .setAllowInvalid(false).build();
    line.getCell(1, 7).setDataValidation(rule);
  }
}

function CheckNewLine(event) {
  let sheet = event.range.getSheet();
  let row = event.range.getRow();
  Logger.log("values=" + event.values);
  Logger.log("Got sheet " + sheet.getName() + " at row " + row);
  let values = event.values
  values.push("")
  CheckLine(sheet, row, null, values=values);
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
  Logger.log("Recheck teams = " + teams);
  let sheet = document.getSheetByName("Проверка");
  if (sheet.getLastRow() > 1) {
    let lines = sheet.getRange(2,1,sheet.getLastRow() - 1, 6).getValues();
    for (let i = startFrom - 2; i < lines.length; ++i) {
      let line = lines[i];
      if (teams.includes(String(line[2]))) {
        CheckLine(sheet, i+2, false);
      }
    }
  }
}

function ManulaRecheck() {
  let documentId = "19_3bzwSmXNqczLV_r7-pNTvOnJQb_fAQe20-be5OVD0";
  let document = SpreadsheetApp.openById(documentId);
  let startFrom = 2;
  let teams = ['1311', 'Полбина-А', 'Полбина-В'];
  RecheckTeams(document, teams, startFrom=startFrom);
}

function CheckAgainFailedLines() {
  let startTime = Date.now();
  let scriptProperties = PropertiesService.getScriptProperties();
  
  // Get documentId
  // let documentId = scriptProperties.getProperty("LinesCheckerTaskId");

  DeleteTimeTriggers();
  let documentId = "11khw1gDrxsJ4wMR1dWHwYsFzOgbBK_0zhtKY9bPTRNg";
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
          CheckLine(sheet, i, null, null, properties);
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
