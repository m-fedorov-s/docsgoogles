function CheckForm(responseEvent) {
  let document = responseEvent.range.getSheet().getParent();
  const documentId = document.getId();
  let values = responseEvent.values;
  if (values.length == 3) {
    values.splice(1, 0, "no mail");
  }
  const problemIndex = Number(responseEvent.range.getSheet().getName());
  values.splice(3, 0, problemIndex);

  Logger.log("Got answer : " + values);
  const correct_answer = document.getSheetByName("Задачи").getRange(problemIndex + 1, 2).getValue();
  const teamIndex = PropertiesService.getScriptProperties().getProperty(documentId + values[2]);

  values.push("вердикт");
  values.push(correct_answer);

  let background = "#ffffff";
  let validation = null;
  if (teamIndex == null) {
    Logger.log("Неизвестная команда" + values[2]);
    background = "#FF000A";
    values[5] = "Команда не найдена!!";
  } else {
    Logger.log("Check team " + teamIndex + ", problem " + problemIndex + ", go to cell (" + (Number(teamIndex) + 2) + ", " + (problemIndex + 1) + ")");
    let resultCell = document.getSheetByName("_результаты").getRange(Number(teamIndex) + 2, problemIndex + 1);
    let wasTime = resultCell.getNote();
    Logger.log("Note is " + wasTime);
    let replace = wasTime == "" || new Date(wasTime) >= new Date(values[0]);
    if (replace) {
      resultCell.setNote(values[0]);
    }
    if (!replace) {
      values[5] = "Повторная отправка. Есть отправка с отметкой " + wasTime;
      values[6] = "";
      background = "#FFA07A";
    } else if (values[4].trim() == correct_answer.trim()) {
      resultCell.setValue(1);
      values[5] = "Верно";
      background = "#00FF00";
      values[6] = "";
    } else {
      resultCell.setValue(null);
      values[5] = "";
      background = "#FFA500";
      validation = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Верно', 'Неверно'], true)
        .setAllowInvalid(false).build();
    }

    let checkList = document.getSheetByName("Проверка");
    let position = checkList.getLastRow();
    let line = checkList.insertRowBefore(position + 1).getRange(position + 1, 1, 1, 7);
    line.getCell(1,6).setDataValidation(null);
    line.setValues([values]);
    line.setBackground(background);
    line.getCell(1,6).setDataValidation(validation);
  }
}

function CheckOnEditSequential(event) {
  let sheet = event.range.getSheet();
  const documentId = sheet.getParent().getId();
  const name = sheet.getSheetName();
  let cell = event.range;
  let column = cell.getColumn();
  let lineIndex = cell.getRow();
  if (name == "Проверка" && column == 6) {
    // Assume it is sequentional game 
    let what = ""
    let line = sheet.getRange(lineIndex, 1, 1, 7);
    let values = line.getValues()[0];
    let problemIndex = values[3];
    let teamName = values[2];
    let teamIndex = Number(PropertiesService.getScriptProperties().getProperty(documentId + teamName));
    Logger.log("Sequential::Checked team " + teamName + ", problem " + problemIndex + ", row " + (teamIndex+2) + " at line " + lineIndex);
    let res_cell = sheet
                   .getParent()
                   .getSheetByName("_результаты")
                   .getRange(teamIndex + 2, problemIndex + 1);

    // let score = (rowIndex + 1) * 10;
    let score = 1; // kerstiki

    if (values[5] == "Верно") {
      what = "Поставлено " + String(score);
      line.setBackground("#00FF00");
      if (res_cell.getValue() == "0") {
        line.setBackground("#FFA07A");
        what += " (Повторная отправка?)";
      }
      res_cell.setValue(score);
    } else if (values[5] == "Неверно") {
      what = "Поставлено 0";
      line.setBackground("#D0FA58");
      res_cell.setValue(0);
    } else if (values[5] == "Пропустить") {
      what = "Пропущено";
      line.setBackground("#ffffff");
      sheet.hideRows(lineIndex);
    } else {
      Logger.log("Неизвестный вердикт!!? (" + values[5] + ")");
      return;
    }
    line.getCell(1, 7).setValue(what);
  } else if (name == "_настройки") {
    if (column == 2 && lineIndex == 1 && String(cell.getValue()) == "Внести изменения") {
      InitializeSequential(sheet.getParent());
      sheet.getRange(1, 2).setValue("Обновлено")
    } else {
      sheet.getRange(1, 2).setValue("Изменено");
    }
  } else if (name == "Задачи" || name == "Команды") {
    sheet.getParent().getSheetByName("_настройки").getRange(1, 2).setValue("Изменено");
  }
}
