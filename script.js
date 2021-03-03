function sortGoogleSheets() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  // Store all the worksheets in this array
  let sheetNameArray = [];
  let sheets = ss.getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (let i = 0; i < sheets.length; i++) {
    sheetNameArray.push(sheets[i].getName());
  }

  sheetNameArray.sort();
  Logger.log("Sorted: ");
  Logger.log(sheetNameArray);
  // Reorder the sheets.
  for (let j = 0; j < sheets.length; j++) {
    ss.setActiveSheet(ss.getSheetByName(sheetNameArray[j]));
    ss.moveActiveSheet(j + 1);
  }
  ss.setActiveSheet(ss.getSheetByName("_Вводная"));
  ss.moveActiveSheet(1);
}

function CreateGameTable(sheet, columns, rowsCount) {
  let columnsCaptions = [["Столбец/ строка",].concat(columns)];
  let plusFormula = "Sum(R[" + (-3 - rowsCount) + "]C[0]:R[" + (-1 - rowsCount) + "]C[0]; R[" + (-2 - rowsCount) + "]C[-1]:R[" + (-2 - rowsCount) + "]C[1]) - R[" + (-2 - rowsCount) + "]C[0]";
  let finalFormula = "SUMPRODUCT(R[" + (-rowsCount) + "]C[-" + columns.length + "]:R[-1]C[-1]; R[2]C[-" + columns.length + "]:R[" + (rowsCount + 1) + "]C[-1])";
  sheet.getRange(rowsCount + 5, 2, rowsCount, columns.length).setFormulaR1C1(plusFormula).setFontColor("white");
  sheet.getRange(rowsCount + 3, columns.length + 2).setFormulaR1C1(finalFormula);
  sheet.getRange(3, 1, rowCaptions.length, 1).setValues(rowCaptions.map(i => [i,]));
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange(2, 1, 1, columnsCaptions[0].length).setValues(columnsCaptions);
}

function ClearForm(form) {
  for (let item of form.getItems()) {
    form.deleteItem(item);
  }
}

function Initialize() {
  const document = SpreadsheetApp.getActiveSpreadsheet()
  let inputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("_вводные_данные");
  const data = inputSheet.getDataRange().getValues();
  const rows = data.length;
  let groups = new Map();
  let teams = [];
  let columnsCount = 0;
  let rowsCount = 0;
  for (let i = 0; i < rows; ++i) {
    const line = data[i];
    if (line[0] == "Столбцы") {
      columnsCount = Number(line[1]);
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
      for (let j = 1; j < line.length; ++j) {
        if (String(line[j]) == "") {
          break;
        }
        teams.push(String(line[j]));
      }
      Logger.log("Считано " + (line.length - 1) + " команд.");
    } else if (line[0] == "Группа команд") {
      let group = []
      let group_name = String(line[1]);
      for (let j = 2; j < line.length; ++j) {
        if (String(line[j]) == "") {
          break;
        }
        group.push(String(line[j]));
      }
      groups.set(group_name, group);
      Logger.log("Считана группа из " + group.length + " команд.");
    }
  }
  Logger.log("Считаны данные.");
  rowCaptions = Array.from(Array(rowsCount).keys(), (_, i) => i + 1);
  columns = Array.from(Array(columnsCount), (_, i) => String.fromCharCode('A'.charCodeAt() + i));
  Logger.log("Columns are " + columns);
  Logger.log("rowCaptions are " + rowCaptions);
  // Создаем лист с ответами.
  var answers = document.getSheetByName("_ответы");
  if (answers == null) {
    answers = document.insertSheet();
    answers.setName("_ответы");
  }
  answersCaptions = [["Столбец", "Строка"]];
  for (let i = 0; i < columnsCount; ++i) {
    for (let j = 1; j <= rowsCount; ++j) {
      answersCaptions.push([String.fromCharCode('A'.charCodeAt() + i), j])
    }
  }
  answers.getRange(1, 1, columnsCount * rowsCount + 1, 2).setValues(answersCaptions);
  answers.getRange(1, 3).setValue("Правильный ответ");
  answers.getRange("C:C").setNumberFormat("@");
  Logger.log("Создан лист с ответами.");
  // создаем формы для приема ответов
  forms = []
  formsCount = PropertiesService.getScriptProperties().getProperty("formsCount");
  if (formsCount == null) {
    Logger.log("No binded forms found.")
    if (teams.length > 0) {
      let form = FormApp.create('Сдача ответов для крестиков-ноликов.');
      forms.push(form);
      form.addListItem()
        .setTitle('Ваша команда:')
        .setChoiceValues(teams)
        .setRequired(true);
    }
    for (let [key, value] of groups) {
      let form = FormApp.create('Сдача ответов для крестиков-ноликов (группа ' + key + ")")
      forms.push(form);
      form.addListItem()
        .setTitle('Ваша команда:')
        .setChoiceValues(value)
        .setRequired(true);
    }
    Logger.log("Created " + forms.length + " forms");
    PropertiesService.getScriptProperties().setProperty("formsCount", forms.length);
    for (let index = 0; index < forms.length; ++index) {
      let form = forms[index];
      PropertiesService.getScriptProperties().setProperty("formId" + index, form.getId());
      form.setDestination(FormApp.DestinationType.SPREADSHEET, document.getId());
    }
    Logger.log("Saved forms ids");
  } else {
    Logger.log("Found " + formsCount + " forms");
    let index = 0;
    if (teams.length > 0) {
      let form = FormApp.openById(PropertiesService.getScriptProperties().getProperty("formId" + index));
      ++index;
      Logger.log("Found form " + form.getId());
      ClearForm(form);
      forms.push(form);
      form.addListItem()
        .setTitle('Ваша команда:')
        .setChoiceValues(teams)
        .setRequired(true);
    }
    for (let [key, value] of groups) {
      let form = FormApp.openById(PropertiesService.getScriptProperties().getProperty("formId" + index));
      ++index;
      Logger.log("Found form " + form.getId());
      ClearForm(form);
      form.setTitle('Сдача ответов для крестиков-ноликов (группа ' + key + ")");
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
  // var costs_captions = [];
  // const bonusForColumn = 'IF(AND(COUNTBLANK(R[-' + themeSize + ']C[0]:R[-1]C[0])=0;COUNTIF(R[-' + themeSize + ']C[0]:R[-1]C[0];"=0")=0);50;"")';
  // const bonusForRow = 'IF(AND(COUNTIf(R[0]C[-' + themes.length + ']:R[0]C[-1]; "=0")=0;COUNTBLANK(R[0]C[-' + themes.length + ']:R[0]C[-1])=0); R[0]C[-' + (themes.length + 1) + '];"")';
  // for (let i = 1; i < themeSize + 1; ++i) {
  //   costs_captions.push([10 * i]);
  // }
  // costs_captions.push(["Бонус за тему"]);
  // создаем лист для первой команды
  let basic_sheet = document.getSheetByName(teams[0]);
  if (basic_sheet != null) {
    basic_sheet.clear();
  } else {
    basic_sheet = document.insertSheet();
    basic_sheet.setName(teams[0]);
  }
  CreateGameTable(basic_sheet, columns, rowsCount);
  basic_sheet.getRange(1, 1).setValue(teams[0]);
  // basic_sheet.getRange(3, themes.length + 2, themeSize, 1).setFormulaR1C1(bonusForRow);
  // basic_sheet.getRange(themeSize + 3, 2, 1, themes.length).setFormulaR1C1(bonusForColumn);
  // basic_sheet.getRange(themeSize + 3, themes.length + 2).setFormulaR1C1("Sum(R[-" + themeSize + "]C[-" + themes.length + "]:R[-1]C[0];R[0]C[-" + themes.length + "]:R[0]C[-1])");
  document.setActiveSheet(basic_sheet);
  Logger.log("Moving sheet to place " + (5 + forms.length) + " of " + document.getNumSheets());
  document.moveActiveSheet(5 + forms.length);
  // копируем листы для остальных команд
  for (i = 1; i < teams.length; ++i) {
    let name = teams[i];
    let newSheet = document.getSheetByName(name);
    if (newSheet != null) {
      document.deleteSheet(newSheet);
    }
    newSheet = basic_sheet.copyTo(document);
    newSheet.setName(name);
    newSheet.getRange("A1").setValue(name);
    document.setActiveSheet(newSheet);
    Logger.log("Moving sheet to place " + (i + 5 + forms.length) + " of " + document.getNumSheets());
    document.moveActiveSheet(i + 5 + forms.length);
  }
  Logger.log("Созданы листы с результатами.")
  // Создаем лист с результатами всех команд.
  let summary = document.getSheetByName("Сводка");
  if (summary != null) {
    summary.clear();
  } else {
    summary = document.insertSheet();
    summary.setName("Сводка");
  }
  let formulas = [];
  let teams_col = [["Команда"],];
  for (let i = 0; i < teams.length; ++i) {
    formulas.push(["='" + teams[i] + "'!R[" + (rowsCount + 1 - i) + "]C[" + columnsCount + "]"]);
    teams_col.push([teams[i]]);
  }
  summary.getRange(1, 1, teams.length + 1, 1).setValues(teams_col);
  summary.getRange(2, 2, teams.length, 1).setFormulasR1C1(formulas);
  summary.getRange(1, 2).setValue("Результат");
  Logger.log("Сводка создана.");
  document.setActiveSheet(summary);
  document.moveActiveSheet(2);
  // Создаем табличку с просмотром результатов.
  let resultsId = PropertiesService.getScriptProperties().getProperty("viewResultsId");
  if (resultsId == null) {
    var viewer = SpreadsheetApp.create("Результаты игры");
    PropertiesService.getScriptProperties().setProperty("viewResultsId", viewer.getId());
    viewer.getSheets()[0].setName("Подробные результаты");
    let overview = viewer.insertSheet();
    overview.setName("Общие баллы");
    Logger.log("Создана табличка для просмотра: " + viewer.getUrl());
  } else {
    var viewer = SpreadsheetApp.openById(resultsId);
    Logger.log("Найдена табличка для просмотра: " + viewer.getId());
  }
  let sheet = viewer.getSheetByName("Подробные результаты");
  let step = rowsCount + 3;
  for (let i = 0; i < teams.length; ++i) {
    sheet.getRange(i * (step + 1) + 1, 1).setFormula('=IMPORTRANGE("' + document.getId() + '"; "\'' + teams[i] + '\'!A1:L' + step + '")')
      .setFontSize(16)
      .setFontWeight("bold");
  }
  let overview = viewer.getSheetByName("Общие баллы");
  let chank = 15;
  for (let i = 0; i * chank < teams.length + 1; ++i) {
    overview.getRange(1, 1 + i * 3).setFormula('=IMPORTRANGE("' + document.getId() + '"; "\'Сводка\'!A' + (1 + i * chank) + ':B' + ((1 + i) * chank) + '")');
  }
  Logger.log("Табличка заполнена");
  // Заполняем формы
  for (let form of forms) {
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
    Logger.log('Published form URL: ' + form.getPublishedUrl());
    Logger.log('Editor form URL: ' + form.getEditUrl());
  }
  PropertiesService.getScriptProperties().setProperty("rowsCount", rowsCount);
  Logger.log("Set rowsCount to " + rowsCount);
}

function CheckLine(name, index) {
  Logger.log("Cheching row " + index + " of sheet " + name);
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  let line = sheet.getRange(index, 1, 1, 7);
  Logger.log("color is " + line.getBackground());
  if (line.getBackground() == "#ffffff") {
    let values = line.getValues();
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
    const rowsCount = Number(PropertiesService.getScriptProperties().getProperty("rowsCount"));
    const answerIndex = columnIndex * rowsCount + rowIndex + 2;
    Logger.log("Looking for column " + columnIndex + " at row " + rowIndex + " (index is " + answerIndex + "; rowsCount is " + rowsCount + ")");
    const correctAnswer = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("_ответы").getRange("C" + String(answerIndex)).getValue();
    const answer = values[0][4];
    if (answer == correctAnswer) {
      line.setBackground("#00FF00");
      const commandName = values[0][1];
      let resultsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(commandName);
      if (resultsheet == null) {
        Logger.log("Failed to find " + commandName);
        line.setBackground("#FF000A");
        line.getCell(1, 7).setValue("Команда не найдена!!");
      }
      let cell = resultsheet.getRange("B3:G8").getCell(rowIndex, columnIndex + 1);
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
      let rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Верно', 'Неверно'], true)
        .setAllowInvalid(false).build();
      line.getCell(1, 6).setDataValidation(rule);
    }
  }
}

function CheckNewLine() {
  let sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (let i = 0; i < sheets.length; i++) {
    let name = sheets[i].getName();
    if (name.substring(0, 8) == "Проверка") {
      Logger.log("Checking " + name);
      let lastRow = sheets[i].getLastRow();
      CheckLine(name, lastRow);
    }
  }
}

function CheckAll() {
  let sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (let i = 0; i < sheets.length; i++) {
    let name = sheets[i].getName();
    if (name.substring(0, 8) == "Проверка") {
      Logger.log("Checking " + name);
      let sheet = sheets[i];
      let lastRow = sheet.getLastRow();
      for (let i = 2; i < lastRow; ++i) {
        CheckLine(name, i);
      }
    }
  }
}

function CheckAnswerAll(columnName, rowIndex, correctAnswer) {
  let doc = SpreadsheetApp.getActiveSpreadsheet();
  let sheets = doc.getSheets();
  Logger.log("Got " + sheets.length + " sheets.");
  for (let i = 0; i < sheets.length; i++) {
    let name = sheets[i].getName();
    if (name.substring(0, 8) == "Проверка") {
      Logger.log("Checking " + name);
      let sheet = sheets[i];
      let lastRow = sheet.getLastRow();
      answrs = sheet.getRange(1, 1, lastRow, 7).getValues();
      for (let j = 0; j < answrs.length; ++j) {
        let line = answrs[j];
        if (line[2] == columnName && line[3] == rowIndex) {
          let rangeLine = sheet.getRange(j + 1, 1, 1, 7);
          Logger.log("Check " + line[1] + " on line " + (j + 1));
          if (line[4] == correctAnswer) {
            Logger.log("Verdict: OK");
            let commandName = line[1];
            rangeLine.setBackground("#00FF00");
            let resultsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(commandName);
            if (resultsheet == null) {
              Logger.log("Failed to find " + commandName);
              rangeLine.setBackground("#FF000A");
              rangeLine.getCell(1, 7).setValue("Команда не найдена!!");
            }
            let cell = resultsheet.getRange("B3:G8").getCell(rowIndex, columnIndex + 1);
            cell.setValue(1);
            rangeLine.getCell(1, 6).setDataValidation(null);
            rangeLine.getCell(1, 6).setValue("OK");
          } else {
            Logger.log("Verdict: unknown");
            rangeLine.setBackground("#FFA500");
            rangeLine.getCell(1, 7).setValue(correctAnswer);
            rangeLine.getCell(1, 6).setValue("");
            let rule = SpreadsheetApp.newDataValidation()
              .requireValueInList(['Верно', 'Неверно'], true)
              .setAllowInvalid(false).build();
            rangeLine.getCell(1, 6).setDataValidation(rule);
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
  let sheet = SpreadsheetApp.getActiveSheet();
  const name = sheet.getSheetName();
  let cell = sheet.getCurrentCell();
  let column = cell.getColumn();
  let line_index = cell.getRow();
  let what = ""
  if (name.substring(0, 8) == "Проверка" && column == 6) {
    let line = sheet.getRange(line_index, 1, 1, 7);
    let values = line.getValues();
    const rowIndex = Number(values[0][3]);
    let columnIndex = String(values[0][2]).charCodeAt(0) - 'A'.charCodeAt();
    const commandName = values[0][1];
    let resultsheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(commandName);
    let res_cell = resultsheet.getRange("B3:G8").getCell(rowIndex, columnIndex + 1);
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
