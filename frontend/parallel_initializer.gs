function DeleteHidden(document, except=[]) {
  let sheets = document.getSheets();
  Logger.log("DeleteHidden::Got " + sheets.length + " sheets (" + except.length + " sheets excluded).");
  for (let sheet of sheets) {
    if (sheet.isSheetHidden() && sheet.getFormUrl() == null && !except.includes(sheet.getName())) {
      Logger.log("Deleted list '" + sheet.getName() + "'");
      document.deleteSheet(sheet);
    }
  }
}

function ReadConfigParallel(document) {
  let result = {};
  result["teams"] = [];
  const infoSheet = document.getSheetByName("_настройки");
  const data = infoSheet.getRange(2, 1, infoSheet.getLastRow() - 1, infoSheet.getLastColumn())
                        .getValues();
  result["groups"] = ReadTeams(document.getSheetByName("Команды"));
  for (let i = 0; i < data.length; ++i) {
    const line = data[i];
    if (line[0] == "Столбцы") {
      result["columns"] = [];
      if (line.length == 2 || String(line[2]) == "") {
        let columnsCount = Number(line[1]);
        for (let index = 0; index < columnsCount; ++index) {
          result["columns"].push(String.fromCharCode('A'.charCodeAt() + index));
        }
      } else {
        for (let index = 1; index < line.length; ++index) {
          if (String(line[index]) == "") {
            break;
          }
          result["columns"].push(String(line[index]).trim());
        }
      }
    } else if (line[0] == "Строки") {
      result["rows"] = [];
      if (line.length == 2 || String(line[2]) == "") {
        let rowsCount = Number(line[1]);
        for (let index = 0; index < rowsCount; ++index) {
          result["rows"].push(String(index + 1));
        }
      } else {
        for (let index = 1; index < line.length; ++index) {
          if (String(line[index]) == "") {
            break;
          }
          result["rows"].push(String(line[index]).trim());
        }
      }
    } else if (line[0] == "Количество команд") {
      let teamsCount = Number(line[1]);
      for (let i = 1; i < teamsCount + 1; ++i) {
        result["teams"].push("Команда "  + i);
      }
    } else if (line[0] == "Название игры") {
      result["gameName"] = line[1];
    } else if (line[0] == "Собирать email") {
      result["collectMails"] = (line[1] == "Да");
    } else if (line[0] == "Повторная отправка ответа") {
      result["secondAnswer"] = line[1];
    }
  }
  result["teams"].sort();
  Logger.log("ReadConfigParallel::Got " + result.gameName + " -> " +
                                          result.teams.length + " teams, " + 
                                          result.groups.length + " variants, " + 
                                          result.rows.length + " rows and " + 
                                          result.columns.length + " columns");
  return result;
}

function CreateTable(sheet, columns, rows) {
  let columnsCaptions = [["Столбец/ строка",].concat(columns)];
  sheet.getRange(3, 1, rows.length, 1).setValues(rows.map(i => [i,]));
  sheet.getRange(2, 1, 1, columnsCaptions[0].length).setValues(columnsCaptions);
}

function FillKrestikiFormulas(sheet, width, heigth) {
  let plusFormula = "SUM(R[" + (-3 - heigth) + "]C[0]:R[" + (-1 - heigth) + "]C[0];" +
    " R[" + (-2 - heigth) + "]C[-1]:R[" + (-2 - heigth) + "]C[1]) - if(R[" + (-2 - heigth) + "]C[0] = 1; 1; 0)";
  let finalFormula = "SUMPRODUCT(R[" + (-heigth) + "]C[-" + width + "]:R[-1]C[-1]; R[2]C[-" + width + "]:R[" + (heigth + 1) + "]C[-1])";
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange(heigth + 5, 2, heigth, width).setFormulaR1C1(plusFormula).setFontColor("white");
  sheet.getRange(heigth + 3, width + 2).setFormulaR1C1(finalFormula);
}

function FillAbakaFormulas(sheet, width, heigth) {
  const bonusForColumn = 'IF(AND(COUNTBLANK(R[-' + heigth + ']C[0]:R[-1]C[0])=0;COUNTIF(R[-' + heigth + ']C[0]:R[-1]C[0];"=0")=0;COUNTIF(R[-' + heigth + ']C[0]:R[-1]C[0];"⏳")=0);50;"")';
  // TODO compute bonuses in prepare time and without references to other cells
  const bonusForRow = 'IF(AND(COUNTIF(R[0]C[-' + width + ']:R[0]C[-1]; "=0")=0;COUNTIF(R[0]C[-' + width + ']:R[0]C[-1]; "⏳")=0;COUNTBLANK(R[0]C[-' + width + ']:R[0]C[-1])=0); R[0]C[-' + (width + 1) + '];"")';
  sheet.getRange(3, width + 2, heigth, 1).setFormulaR1C1(bonusForRow);
  sheet.getRange(heigth + 3, 2, 1, width).setFormulaR1C1(bonusForColumn);
  sheet.getRange(heigth + 3, width + 2).setFormulaR1C1("Sum(R[-" + heigth + "]C[-" + width + "]:R[-1]C[0];R[0]C[-" + width + "]:R[0]C[-1])");
}

function FillAbakaTransposedFormulas(sheet, width, heigth) {
  let bonusesForColumn = [[...Array(width).keys()]
    .map(i => String('IF(AND(COUNTBLANK(R[-' + heigth + ']C[0]:R[-1]C[0])=0;COUNTIF(R[-' + heigth + ']C[0]:R[-1]C[0];"=0")=0;COUNTIF(R[-' + heigth + ']C[0]:R[-1]C[0];"⏳")=0);' + 10 * (i + 1) + ';"")'))];
  const bonusForRow = 'IF(AND(COUNTIF(R[0]C[-' + width + ']:R[0]C[-1]; "=0")=0;COUNTIF(R[0]C[-' + width + ']:R[0]C[-1]; "⏳")=0;COUNTBLANK(R[0]C[-' + width + ']:R[0]C[-1])=0);50;"")';
  sheet.getRange(3, width + 2, heigth, 1).setFormulaR1C1(bonusForRow);
  sheet.getRange(heigth + 3, 2, 1, width).setFormulasR1C1(bonusesForColumn);
  sheet.getRange(heigth + 3, width + 2).setFormulaR1C1("Sum(R[-" + heigth + "]C[-" + width + "]:R[-1]C[0];R[0]C[-" + width + "]:R[0]C[-1])");
}

function FillForm(form, teams, rows, columns, collectMails) {
  let textValidation = FormApp.createTextValidation()
  .setHelpText('Название команды не найдено. Регистр букв и пробелы важны!')
  .requireTextMatchesPattern("(" + teams.join("|") + ")")
  .build();
  form.setCollectEmail(collectMails);
  let items = form.getItems();
  items[0].asTextItem().setValidation(textValidation);
  items[1].asListItem().setChoiceValues(columns);
  items[2].asListItem().setChoiceValues(rows);
}

function CreateForm(baseDocument, name, collectMails) {
  let form = FormApp.create(name).setCollectEmail(collectMails);
  form.addTextItem()
    .setTitle('Ваша команда:')
    .setRequired(true);
  form.addListItem()
    .setTitle('Выберите столбец:')
    .setRequired(true);
  form.addListItem()
    .setTitle('Выберите строку:')
    .setRequired(true);
  form.addTextItem()
    .setTitle('Ваш ответ:')
    .setRequired(true);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, baseDocument.getId());
  return form;
}

function CreateAnswersSheet(document, rows, columns, variantNames) {
  // Создаем лист с ответами.
  let answers = document.getSheetByName("_ответы");
  if (answers == null) {
    answers = document.insertSheet();
    answers.setName("_ответы");
  }

  let numRows = answers.getLastRow(); // The number of rows to clear
  let numColumns = answers.getLastColumn(); // The number of columns to clear
  answers.getRange(1, 1, Math.max(numRows, 1), 2).clear();
  answers.getRange(1, 1, 2, Math.max(numColumns, 1)).clear().breakApart();
  answers.getRange(3, Math.max(numColumns, 1), Math.max(numRows - 2, 1), 1).clear().setDataValidation(null);

  let rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Перепроверить", "Проверено", "Изменено"], true)
    .setAllowInvalid(false).build();
  answers.getRange(3, Math.max(variantNames.length, 1) + 3, columns.length * rows.length, 1)
         .setDataValidation(rule)
         .setValue("Проверено");

  answers.getRange(1, 3, 1, Math.max(variantNames.length, 1))
    .merge().setValue("Правильные ответы");
  if (variantNames.length > 0) {
    answers.getRange(2, 3, 1, variantNames.length).setValues([variantNames]);
  }
  answersCaptions = [["Столбец", "Строка"]];
  for (let i = 0; i < columns.length; ++i) {
    for (let j = 0; j < rows.length; ++j) {
      answersCaptions.push([columns[i], rows[j]]);
    }
  }
  answers.getRange(2, 1, columns.length * rows.length + 1, 2).setValues(answersCaptions);
  answers.getRange(3, 3, columns.length * rows.length, Math.max(variantNames.length, 1)).setNumberFormat("@");
  answers.autoResizeColumns(1, 2 + Math.max(numColumns, 1));
  Logger.log("CreateAnswersSheet::finished");
}

function PushAnswersToServer(document, rows, columns, variantNames) {
  // Создаем лист с ответами.
  let answers = document.getSheetByName("_ответы");
  if (answers == null) {
    Logger.log("Error sending answers to server: no answers sheet found.")
    return;
  }

  var answersData;
  if (variantNames.length > 0) {
    answersData = answers.getRange(3, 3, rows.length * columns.length, Math.max(variantNames.length, 1)).getValues();
  } else {
    answersData = answers.getRange(2, 3, rows.length * columns.length, Math.max(variantNames.length, 1)).getValues();
  }
  let answersPayload = {
    "GameID": document.getId(),
    "Records": [],
  }
  let index = 0; 
  for (let i = 0; i < columns.length; ++i) {
    for (let j = 0; j < rows.length; ++j) {
      for (let varIndex = 0; varIndex < Math.max(variantNames.length, 1); ++varIndex) {
        answersPayload.Records.push({
          "Variant": varIndex,
          "Key": {
            "ColumnIndex": i,
            "RowIndex": j,
          },
          "Data": answersData[index][varIndex]
        });
      }
      ++index;
    }
  }
  let options = {
    'method': 'POST',
    'contentType': 'application/json',
    'payload': JSON.stringify(answersPayload),
    'validateHttpsCertificates': false,
    'muteHttpExceptions': true,
  };
  let response = UrlFetchApp.fetch(SET_ANSWERS_ENDPOINT, options);
  if (!IsHttpOk(response.getResponseCode())) {
    Logger.log("Error sending answers to server: " + response.getContentText() + ", code=" + response.getResponseCode());
  }
}

function BackgroundSheetManager(event) {
  let startTime = Date.now();
  let scriptProperties = PropertiesService.getScriptProperties();
  
  DeleteTimeTriggers();

  // Get documentId
  let documentId = scriptProperties.getProperty("sheetManagerTaskId");
  // Fetch list of teams
  let document = SpreadsheetApp.openById(documentId);
  let summary = document.getSheetByName("Результаты");
  let teams = summary.getRange(2, 1, summary.getLastRow() - 1, 1).getValues().flat();

  let config = ReadConfigParallel(document);
  let basic_sheet = document.insertSheet();
  basic_sheet.hideSheet();
  CreateTable(basic_sheet, config.columns, config.rows);
  let gameType = scriptProperties.getProperty(documentId + "gameType");
  if (gameType == GAME_ABAKA) {
    FillAbakaFormulas(basic_sheet, config.columns.length, config.rows.length);
  } else if (gameType == GAME_ABAKA_TRANSPOSED) {
    FillAbakaTransposedFormulas(basic_sheet, config.columns.length, config.rows.length);
  } else if (gameType == GAME_KRESTIKI) {
    FillKrestikiFormulas(basic_sheet, config.columns.length, config.rows.length);
  } else {
    Logger.log("ERROR: Wrong game type: '" + gameType + "'");
  }
  let allDone = true;
  let startIndex = Number(scriptProperties.getProperty("sheetManagerIndex"));
  for(let index = startIndex; index < teams.length; ++index) {
    let currTime = Date.now();
    if(currTime - startTime >= MAX_RUNNING_TIME) {
      scriptProperties.setProperty("sheetManagerIndex", index);
      ScriptApp.newTrigger("BackgroundSheetManager")
      .timeBased()
      .after(REASONABLE_TIME_TO_WAIT)
      .create();
      allDone = false;
      Logger.log("Progress: " + index + " out of " + teams.length);
      Logger.log("Execution paused after " + (currTime - startTime) + " milliseconds.");
      break;
    } else {
      let name = teams[index];
      if (document.getSheetByName(name) == null) {
        let newSheet = basic_sheet.copyTo(document);
        newSheet.setName(name);
        newSheet.getRange("A1").setValue(name);
        newSheet.hideSheet();
      }
    }
  }
  document.deleteSheet(basic_sheet);
  if (allDone) {
    Logger.log("All sheets created.");
    CreateSummarySheet(document, teams, config.rows, config.columns);
    CreateViewer(document, teams, config.rows.length, config.columns.length);
  }
}

function CreateSummarySheet(document, teams, rows, columns) {
  // Создаем лист с результатами всех команд.
  let summary = document.getSheetByName("Результаты");
  if (summary != null) {
    summary.clear();
  } else {
    summary = document.insertSheet();
    summary.setName("Результаты");
  }
  let formulas = [];
  let teams_col = [["Команда"],];
  for (let i = 0; i < teams.length; ++i) {
    formulas.push(["='" + teams[i] + "'!R[" + (rows.length + 1 - i) + "]C[" + columns.length + "]"]);
    teams_col.push([teams[i]]);
  }
  summary.getRange(1, 1, teams.length + 1, 1)
    .setNumberFormat("@")
    .setValues(teams_col);
  summary.getRange(2, 2, teams.length, 1).setFormulasR1C1(formulas);
  summary.getRange(1, 2).setValue("Результат");
  summary.autoResizeColumns(1, 1);
  document.setActiveSheet(summary);
  document.moveActiveSheet(3);
  Logger.log("Лист Результаты создан.");
}

function CreateViewer(document, teams, height, width) {
  const documentId = document.getId();
  let viewer;
  let resultsId = PropertiesService.getScriptProperties().getProperty(documentId + "viewResultsId");
  if (resultsId == null) {
    viewer = SpreadsheetApp.create("Результаты игры");
    PropertiesService.getScriptProperties().setProperty(documentId + "viewResultsId", viewer.getId());
    let subject = "Не работает. Требуется доступ.";
    let body = "Привет!\n" + 
               "Зайди по ссылке, нажми кнопочку.\n" +
               "Ссылка: " + viewer.getUrl() + "\n" +
               "Если это были не вы, проигнорируйте это письмо.\n" +
               "С уважением, автоматика.";
    GmailApp.sendEmail("fedorov.mikhail.s@gmail.com", subject, body);
    viewer.getSheets()[0].setName("Общие баллы");
    let results = viewer.insertSheet();
    results.setName("Подробные результаты");
    Logger.log("Создана табличка для просмотра: " + viewer.getUrl());
  } else {
    viewer = SpreadsheetApp.openById(resultsId);
    Logger.log("Найдена табличка для просмотра: " + viewer.getId());
  }
  let sheet = viewer.getSheetByName("Подробные результаты");
  sheet.clear();
  sheet.getRange(1, 1, 1, width + 2)
    .breakApart()
    .merge()
    .setValue("Если видите ошибку '#REF!', попробуйте обновить страницу.")
    .setFontSize(12)
    .setHorizontalAlignment("center");
  let step = height + 3;
  for (let i = 0; i < teams.length; ++i) {
    sheet.getRange(i * (step + 1) + 2, 1)
      .setFormula('=IMPORTRANGE("' + document.getId() + '"; "\'' + teams[i] + '\'!A1:L' + step + '")')
      .setFontSize(16)
      .setFontWeight("bold");
    sheet.getRange(i * (step + 1) + height + 4, width + 2)
      .setFontSize(13)
      .setFontWeight("bold");
  }
  let overview = viewer.getSheetByName("Общие баллы");
  let chank = 20;
  overview.getRange(1, 1, 1, Math.max(4, ((teams.length + 1) / chank + 1) * 3))
    .breakApart()
    .merge()
    .setValue("Если видите ошибку '#REF!', попробуйте обновить страницу.")
    .setFontSize(12)
    .setHorizontalAlignment("center");
  for (let i = 0; i * chank < teams.length + 1; ++i) {
    overview.getRange(2, 1 + i * 3).setFormula('=IMPORTRANGE("' + document.getId() + '"; "\'Результаты\'!A' + (1 + i * chank) + ':B' + ((1 + i) * chank) + '")');
  }
  let file = DriveApp.getFileById(viewer.getId());
  // Set sharing parameters so ANYONE can VIEW this spreadsheet
  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
  document.getSheetByName("Вводная").getRange(1, 3, 1, 2).setValues([["Просмотр результатов: ", viewer.getUrl()]]);
  Logger.log("Табличка заполнена");
  return viewer.getUrl();
}

function InitializeParallel(document) {
  const documentId = document.getId();
  let restart = PropertiesService.getScriptProperties().getProperty(documentId + "Restart");
  Logger.log("Restart = " + restart);
  if (restart == 'true') {
    Logger.log("Restarting everything");
    DeleteHidden(document);
  }
  let config = ReadConfigParallel(document);
  let teamMap = {};
  for (let teamName of config.teams) {
    teamMap[teamName] = 0;
  }
  for (let variantIndex = 0; variantIndex < config.groups.length; ++variantIndex) {
    let groupTeams = config.groups[variantIndex];
    for (let teamName of groupTeams) {
      teamMap[teamName] = variantIndex;
    }
  }
  let gameType = PropertiesService.getScriptProperties().getProperty(documentId + "gameType");
  let update = {
    "ID":documentId,
    "Type":GameTypeToInt(gameType),
    "Name":config.gameName,
    "Teams":teamMap,
    "ColumnNames":config.columns,
    "RowNames":config.rows,
  };
  Logger.log(JSON.stringify(update));
  let options = {
    'method': 'POST',
    'contentType': 'application/json',
    'payload': JSON.stringify(update),
    'validateHttpsCertificates': false,
    'muteHttpExceptions': true,
  };
  let response = UrlFetchApp.fetch(SET_SETTINGS_ENDPOINT, options);
  Logger.log(response.getContentText());
  let updatedProperties = {};
  updatedProperties[documentId + 'secondAnswerPolicy'] = config["secondAnswer"];
  Logger.log("Columns are " + config.columns);
  Logger.log("Rows are " + config.rows);
  // создаем форму для приема ответов
  let formId = PropertiesService.getScriptProperties().getProperty(documentId +"formId0");
  let form = null;
  if (formId == null) {
    Logger.log("No binded forms found.");
    form = CreateForm(document, 'Сдача ответов ' + config.gameName, config.collectMails);
    updatedProperties[documentId + "formId0"] = form.getId();
  } else {
    Logger.log("Opened form " + formId);
    form = FormApp.openById(formId);
  }

  let variants = config.groups.length > 1 ? [...Array(config.groups.length).keys()].map(i => "Вариант " + (i + 1)) : [];
  updatedProperties[documentId + "variants_count"] = Math.max(config.groups.length, 1);
  // PropertiesService.getScriptProperties().setProperty(documentId + "variants_count", Math.max(config.groups.length, 1));
  for (let variantIndex = 0; variantIndex < config.groups.length; ++variantIndex) {
    let groupTeams = config.groups[variantIndex];
    groupTeams.sort();
    for (let teamName of groupTeams) {
      updatedProperties[documentId + teamName] = variantIndex;
      // PropertiesService.getScriptProperties().setProperty(documentId + teamName, variantIndex);
    }
    config.teams = config.teams.concat(groupTeams);
  }
  config.teams.sort();
  Logger.log("Variants are " + variants);
  Logger.log("Got " + config.teams.length + " teams, " + variants.length + " variants, " + config.rows.length + " rows and " + config.columns.length + " columns");
  DeleteHidden(document, config.teams);

  FillForm(form, config.teams, config.rows, config.columns, config.collectMails);
  CreateAnswersSheet(document, config.rows, config.columns, variants);
  PushAnswersToServer(document, config.rows, config.columns, variants);
  Logger.log("Зарегестрировано " + config.teams.length + " команд.");

  // Создаем табличку с просмотром результатов.
  CreateSummarySheet(document, config.teams, config.rows, config.columns);
  
  // Create task to create and fill sheets for each team.
  let props = PropertiesService.getScriptProperties();
  props.setProperty("sheetManagerTaskId", documentId);
  props.setProperty("sheetManagerIndex", 0);
  ScriptApp.newTrigger("BackgroundSheetManager")
    .timeBased()
    .after(REASONABLE_TIME_TO_WAIT)
    .create();
  Logger.log("Создан триггер для создания листов с результатами.");

  // Провязываем форму с табличками.
  let viewerLink = CreateViewer(document, config.teams, config.rows.length, config.columns.length);
  form.setDescription("Можно проверить координаты ячейки в табличке по ссылке " + viewerLink);
  form.setConfirmationMessage("Результаты можно посмотреть по ссылке " + viewerLink);
  let pubUrl = form.shortenFormUrl(form.getPublishedUrl());
  let editUrl = form.getEditUrl();
  let links = [["Ссылка на сдачу", "Ссылка на редактирование!!"], [pubUrl, editUrl]];
  Logger.log('Published form URL: ' + pubUrl);
  Logger.log('Editor form URL: ' + editUrl);
  document.getSheetByName("Вводная").getRange(3, 3, 2, 2).setValues(links);

  // Rename form answers sheet
  if (document.getSheetByName("Проверка") == null) {
    let sheets = document.getSheets();
    for (let sheet of sheets) {
      if (sheet.getFormUrl() != null) {
        sheet.setName("Проверка").activate();
        document.moveActiveSheet(2);
        sheet.getRange(1, 7, 1, 2).setValues([["Вердикт", "Правильный ответ"]]);
      }
    }
  }
  // Save properties
  updatedProperties[documentId + "rowsCount"] = config.rows.length;
  updatedProperties[documentId + "columnsCount"] = config.columns.length;
  for (let i in config.rows) {
    updatedProperties[documentId + config.rows[i]] = i;
  }
  Logger.log("Rows = " + config.rows);
  for (let i in config.columns) {
    updatedProperties[documentId + config.columns[i]] = i;
  }
  Logger.log("Columns = " + config.columns);
  updatedProperties[documentId + "Restart"] = false;
  props.setProperties(updatedProperties);
}
