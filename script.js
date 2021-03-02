function sortGoogleSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Store all the worksheets in this array
  var sheetNameArray = [];
  var sheets = ss.getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (var i = 0; i < sheets.length; i++) {
    sheetNameArray.push(sheets[i].getName());
  }

  sheetNameArray.sort();
  Logger.log("Sorted: ");
  Logger.log(sheetNameArray);
  // Reorder the sheets.
  for( var j = 0; j < sheets.length; j++ ) {
    ss.setActiveSheet(ss.getSheetByName(sheetNameArray[j]));
    ss.moveActiveSheet(j + 1);
  }
  ss.setActiveSheet(ss.getSheetByName("_Вводная"));
  ss.moveActiveSheet(1);
}

function Initialize() {
  const document = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("_вводные_данные");
  const data = sheet.getDataRange().getValues();
  const rows = data.length;
  var groups = new Map();
  var teams = [];
  var columnsCount = 0;
  var rowsCount = 0;
  var create = false;
  for (let i = 0; i < rows; ++i) {
    const line = data[i];
    if (line[0] == "Столбцы") {
      columnsCount= Number(line[1]);
      Logger.log("Got " + columnsCount + " cols");
    } else if (line[0] == "Строки") {
      rowsCount = Number(line[1]);
      Logger.log("Got " + rowsCount + " rows");
    } else if (line[0] == "Количество команд") {
      let teamsCount = Number(line[1]);
      for (let i = 1; i < teamsCount + 1; ++i) {
        teams.push("Команда" + i);
      }
      Logger.log("Got " + teams.length + " teams");
    } else if (line[0] == "Команды") {
      for (var j = 1; j < line.length; ++j) {
        if (String(line[j]) == "") {
          break;
        }
        teams.push(String(line[j]));
      }
      Logger.log("Считано " + (line.length - 1) + " команд.");
    } else if (line[0] == "Группа команд") {
      let group = []
      let group_name = String(line[1]);
      for (var j = 2; j < line.length; ++j) {
        if (String(line[j]) == "") {
          break;
        }
        group.push(String(line[j]));
      }
      groups.set(group_name, group);
      Logger.log("Считана группа из " + (group.length - 1) + " команд.");
    } else if (line[0] == "create") {
      create = Number(line[1]) != 0;
    }
  }
  Logger.log("Считаны данные.");
  rowCaptions = Array.from(Array(rowsCount).keys(), (_, i) => i + 1);
  columns = Array.from(Array(columnsCount), (_, i) => String.fromCharCode('A'.charCodeAt() + i));
  Logger.log("Columns are " + columns);
  Logger.log("rowCaptions are " + rowCaptions);
  // Создаем лист с ответами.
  var answers = document.getSheetByName("_ответы");
  if (answers != null) {
    answers.clear();
  } else {
    answers = document.insertSheet();
    answers.setName("_ответы");
  }
  answersCaptions = [["Столбец", "Строка", "Правильный ответ"]];
  for (var i = 0; i < columnsCount; ++i) {
    for (var j = 1; j <= rowsCount; ++j) {
      answersCaptions.push([String.fromCharCode('A'.charCodeAt() + i), j, ""])
    }
  }
  answers.getRange(1, 1, columnsCount * rowsCount + 1, 3).setValues(answersCaptions);
  answers.getRange("C:C").setNumberFormat("@");
  Logger.log("Создан лист с ответами.");
  // создаем формы для приема ответов
  forms = []
  if (create) {
    if (teams.length > 0) {
      var form = FormApp.create('Сдача ответов для крестиков-ноликов.');
      forms.push(form);
      form.addListItem()
        .setTitle('Ваша команда:')
        .setChoiceValues(teams)
        .setRequired(true);
    }
    for (let [key, value] of groups) {
      var form = FormApp.create('Сдача ответов для крестиков-ноликов (группа ' + key + ")")
      forms.push(form);
      form.addListItem()
        .setTitle('Ваша команда:')
        .setChoiceValues(value)
        .setRequired(true);
    }
  }
  for (let [key, value] of groups) {
      teams = teams.concat(value);
  }
  teams.sort();
  Logger.log("Зарегестрировано " + teams.length + " команд.");
  // создаем листы с оценками для каждой команды.
  var columnsCaptions = [["Столбец/ строка",].concat(columns)];
  var plusFormula = "Sum(R["+ (-3-rowsCount) + "]C[0]:R["+ (-1-rowsCount) + "]C[0]; R["+ (-2-rowsCount) + "]C[-1]:R["+ (-2-rowsCount) + "]C[1]) - R["+ (-2-rowsCount) + "]C[0]";
  var finalFormula= "SUMPRODUCT(R[" + (-rowsCount) + "]C[-" + columnsCount + "]:R[-1]C[-1]; R[2]C[-" + columnsCount + "]:R[" + (rowsCount + 1) + "]C[-1])";
  // var costs_captions = [];
  // const bonusForColumn = 'IF(AND(COUNTBLANK(R[-' + themeSize + ']C[0]:R[-1]C[0])=0;COUNTIF(R[-' + themeSize + ']C[0]:R[-1]C[0];"=0")=0);50;"")';
  // const bonusForRow = 'IF(AND(COUNTIf(R[0]C[-' + themes.length + ']:R[0]C[-1]; "=0")=0;COUNTBLANK(R[0]C[-' + themes.length + ']:R[0]C[-1])=0); R[0]C[-' + (themes.length + 1) + '];"")';
  // for (var i = 1; i < themeSize + 1; ++i) {
  //   costs_captions.push([10 * i]);
  // }
  // costs_captions.push(["Бонус за тему"]);
  // создаем лист для первой команды
  var basic_sheet = document.getSheetByName(teams[0]);
  if (basic_sheet != null) {
    basic_sheet.clear();
  } else {
    basic_sheet = document.insertSheet();
    basic_sheet.setName(teams[0]);
  }
  basic_sheet.getRange(1, 1).setValue(teams[0]);
  basic_sheet.getRange(rowsCount + 5, 2, rowsCount, columnsCount).setFormulaR1C1(plusFormula).setFontColor("white");
  basic_sheet.getRange(rowsCount + 3, columnsCount + 2).setFormulaR1C1(finalFormula);
  basic_sheet.getRange(3, 1, rowCaptions.length, 1).setValues(rowCaptions.map(i => [i, ]));
  basic_sheet.getRange("A:A").setNumberFormat("@");
  // basic_sheet.getRange(3, themes.length + 2, themeSize, 1).setFormulaR1C1(bonusForRow);
  // basic_sheet.getRange(themeSize + 3, 2, 1, themes.length).setFormulaR1C1(bonusForColumn);
  // basic_sheet.getRange(themeSize + 3, themes.length + 2).setFormulaR1C1("Sum(R[-" + themeSize + "]C[-" + themes.length + "]:R[-1]C[0];R[0]C[-" + themes.length + "]:R[0]C[-1])");
  basic_sheet.getRange(2, 1, 1, columnsCaptions[0].length).setValues(columnsCaptions);
  // копируем листы для остальных команд
  for (i = 1; i < teams.length; ++i) {
    var name = teams[i];
    var newSheet = document.getSheetByName(name);
    if (newSheet != null) {
      document.deleteSheet(newSheet);
    }
    newSheet = basic_sheet.copyTo(document);
    newSheet.setName(name);
    newSheet.getRange("A1").setValue(name);
  }
  Logger.log("Созданы листы с результатами.")
  // Создаем лист с результатами всех команд.
  var summary = document.getSheetByName("Сводка");
  if (summary != null) {
    summary.clear();
  } else {
    summary = document.insertSheet();
    summary.setName("Сводка");
  }
  var formulas = [];
  var teams_col = [["Команда"],];
  for (var i = 0; i < teams.length; ++i) {
    formulas.push(["='" + teams[i] + "'!R[" + (rowsCount + 1 - i) + "]C[" + columnsCount + "]"]);
    teams_col.push([teams[i]]);
  }
  summary.getRange(1, 1, teams.length + 1, 1).setValues(teams_col);
  summary.getRange(2, 2, teams.length, 1).setFormulasR1C1(formulas);
  summary.getRange(1, 2).setValue("Результат");
  Logger.log("Сводка создана.");
  // Создаем табличку с просмотром результатов.
  if (create) {
    var viewer = SpreadsheetApp.create("Результаты игры");
    var sheet = viewer.getSheets()[0];
    sheet.setName("Подробные результаты");
    Logger.log("Создана табличка для просмотра: " + viewer.getUrl());
    var step = rowsCount + 3;
    for (let i = 0; i < teams.length; ++i) {
      sheet.getRange(i * (step + 1) + 1, 1).setFormula('=IMPORTRANGE("' + document.getId() + '"; "\'' + teams[i] + '\'!A1:L' + step + '")')
        .setFontSize(16)
        .setFontWeight("bold");
    }
    var overview = viewer.insertSheet();
    for (let i = 0; i * 10 < teams.length; ++i) {
      overview.getRange(1, 1 + i * 3).setFormula('=IMPORTRANGE("' + document.getId() + '"; "\'Сводка\'!A' + (1 + i * 10) + ':B' + (11 + i * 10) + '")');
    }
    overview.getRange
    Logger.log("Табличка заполнена");
    sortGoogleSheets(document);
  }
  // Заполняем формы
  for (var form of forms) {
    form.setDescription("Можно проверить координаты ячейки в табличке по ссылке " + viewer.getUrl());
    form.addMultipleChoiceItem()
      .setTitle('Выберете столбец:')
      .setChoiceValues(columns)
      .showOtherOption(false)
      .setRequired(true);
    form.addMultipleChoiceItem()
      .setTitle('Выберете строку:')
      .setChoiceValues(rowCaptions)
      .showOtherOption(false)
      .setRequired(true);
    form.addTextItem()
      .setTitle('Ваш ответ:')
      .setRequired(true);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, document.getId());
    Logger.log('Published form URL: ' + form.getPublishedUrl());
    Logger.log('Editor form URL: ' + form.getEditUrl());
  }
  PropertiesService.getScriptProperties().setProperty("rowsCount", rowsCount);
  Logger.log("Set rowsCount to " + rowsCount);
}

function CheckLine(name, index) {
  Logger.log("Cheching row " + index + " of sheet " + name);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  var line = sheet.getRange(index, 1, 1, 7);
  Logger.log("color is " + line.getBackground());
  if (line.getBackground() == "#ffffff") {
    var values = line.getValues();
    const columnIndex = String(values[0][2]).charCodeAt(0) - 'A'.charCodeAt();
    const rowIndex = Number(values[0][3]) - 1;
    // var columnIndex = 0;
    // if (theme == "Буквы") {
    //   columnIndex = 0;
    // } else if (theme == "Числа") {
    //   columnIndex = 1;
    // } else if (theme == "Комбинаторика+Логика") {
    //   columnIndex = 2;
    // } else if (theme == "Геометрия") {
    //   columnIndex = 3;
    // } else if (theme == "Текстовые задачи") {
    //   columnIndex = 4;
    // } else {
    //   Logger.log("Unknown theme!! = '" + theme + "'");
    // }
    var rowsCount = Number(PropertiesService.getScriptProperties().getProperty("rowsCount"));
    const answerIndex = columnIndex * rowsCount + rowIndex + 2;
    Logger.log("Looking for column " + columnIndex + " at row " + rowIndex + " (index is " + answerIndex + "; rowsCount is " + rowsCount + ")");
    const correctAnswer = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("_ответы").getRange("C" + String(answerIndex)).getValue();
    const answer = values[0][4];
    if (answer == correctAnswer) {
      line.setBackground("#00FF00");
      const commandName = values[0][1];
      var resultsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(commandName);
      if (resultsheet == null) {
        Logger.log("Failed to find " + commandName);
        line.setBackground("#FF000A");
        line.getCell(1, 7).setValue("Команда не найдена!!");
      }
      var cell = resultsheet.getRange("B3:G8").getCell(rowIndex, columnIndex + 1);
      if (cell.getValue() == "0") {
        line.setBackground("#FFA07A");
        line.getCell(1, 7).setValue("Повторная отправка?");
      }
      cell.setValue(1);
      line.getCell(1, 6).setDataValidation(null);
      line.getCell(1, 6).setValue("OK");
    } else {
      line.setBackground("#FFA500");
      line.getCell(1, 7).setValue(correctAnswer);
      var rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Верно', 'Неверно'], true)
        .setAllowInvalid(false).build();
      line.getCell(1, 6).setDataValidation(rule);
    }
  }
}

function CheckNewLine() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.substring(0, 8) == "Проверка") {
      Logger.log("Checking " + name);
      var sheet = sheets[i];
      var lastRow = sheet.getLastRow();
      CheckLine(name, lastRow);
    }
  }
}

function CheckAll() {
  var sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.substring(0, 8) == "Проверка") {
      Logger.log("Checking " + name);
      var sheet = sheets[i];
      var lastRow = sheet.getLastRow();
      for (var i = 2; i < lastRow; ++i) {
        CheckLine(name, i);
      }
    }
  }
}

function CheckAnswerAll(columnIndex, rowIndex, correctAnswer) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = doc.getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name.substring(0, 8) == "Проверка") {
      Logger.log("Checking " + name);
      var sheet = sheets[i];
      var lastRow = sheet.getLastRow();
      answrs = sheet.getRange(1,1, lastRow, 7).getValues();
      for (let j = 0; j < answrs.length; ++j) {
        var line = answrs[j];
        if (line[2] == theme && line[3] == rowIndex) {
          Logger.log("Check " + line[1] + " on line " + (j + 1));
          if (line[4] == correctAnswer) {
            Logger.log("Verdict: OK");
            let commandName = line[1];
            sheet.getRange(j + 1, 1, 1, 7).setBackground("#00FF00");
            var resultsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(commandName);
            if (resultsheet == null) {
              Logger.log("Failed to find " + commandName);
              sheet.getRange(j + 1, 1, 1, 7).setBackground("#FF000A");
              sheet.getRange(j + 1, 1, 1, 7).getCell(1, 7).setValue("Команда не найдена!!");
            }
            var cell = resultsheet.getRange("B3:G8").getCell(rowIndex, columnIndex + 1);
            cell.setValue(1);
            sheet.getRange(j + 1, 1, 1, 7).getCell(1, 6).setDataValidation(null);
            sheet.getRange(j + 1, 1, 1, 7).getCell(1, 6).setValue("OK");
          } else {
            Logger.log("Verdict: unknown");
            sheet.getRange(j + 1, 1, 1, 7).setBackground("#FFA500");
            sheet.getRange(j + 1, 1, 1, 7).getCell(1, 7).setValue(correctAnswer);
            sheet.getRange(j + 1, 1, 1, 7).getCell(1, 6).setValue("");
            var rule = SpreadsheetApp.newDataValidation()
              .requireValueInList(['Верно', 'Неверно'], true)
              .setAllowInvalid(false).build();
            sheet.getRange(j + 1, 1, 1, 7).getCell(1, 6).setDataValidation(rule);
            var cell = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Сводка").getRange("D2").getCell(1, 1);
            var value = Number(cell.getValue());
            cell.setValue(value + 1);
          }
        }
      }
    }
  }
}

function Kostil() {
  CheckAnswerAll("Комбинаторика+Логика", "10", "15");
  CheckAnswerAll("Комбинаторика+Логика", "30", "5625");
  return 0;
}

function CheckOnEdit() {
  var sheet = SpreadsheetApp.getActiveSheet();
  const name = sheet.getSheetName();
  var cell = sheet.getCurrentCell();
  var column = cell.getColumn();
  var line_index = cell.getRow();
  var what = ""
  if (name.substring(0, 8) == "Проверка" && column == 6) {
    var line = sheet.getRange(line_index, 1, 1, 7);
    var values = line.getValues();
    const rowIndex = Number(values[0][3]);
    var columnIndex = String(values[0][2]).charCodeAt(0) - 'A'.charCodeAt();
    const commandName = values[0][1];
    var resultsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(commandName);
    var res_cell = resultsheet.getRange("B3:G8").getCell(rowIndex, columnIndex + 1);
    if (values[0][5] == "Верно") {
      what = "1";
      line.setBackground("#00FF00");
      if (res_cell.getValue() == "0") {
        line.setBackground("#FFA07A");
        line.getCell(1, 7).setValue("Повторная отправка");
      } else {
        res_cell.setValue(1);
      }
    } else if (values[0][5] == "Неверно") {
      what = "0";
      line.setBackground("#D0FA58");
      res_cell.setValue(0);
    } else {
      Logger.log("Неизвестный вердикт!!?");
      return;
    }
    cell.setDataValidation(null);
    cell.setValue("Поставлено " + what);
  }
}
