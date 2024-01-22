function ProcessGameRequest(responceEvent) {
  let values = []
  for (let item of responceEvent.response.getItemResponses()) {
    values.push(item.getResponse());
  }
  let emails = [responceEvent.response.getRespondentEmail()];
  let gameType = values[0];
  let gameName = values[1];
  if (gameName == "") {
    gameName = gameType;
  }
  var emailRe = /\S+@\S+\.\S+/;
  Logger.log("Emails answer = " + values[2]);
  for (let email of values[2].split(",")) {
    if (emailRe.test(email.trim())) {
      emails.push(email.trim());
    } else {
      Logger.log(email.trim() + " is not an email. ('" + email + "')");
    }
  }
  Logger.log("Emails = " + emails);
  let newDocument = SpreadsheetApp.create(gameName);
  let props = PropertiesService.getScriptProperties();
  props.setProperty("document" + responceEvent.response.getId(), newDocument.getId());
  props.setProperty(newDocument.getId() + "gameType", gameType);
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();
  today = mm + '/' + dd + '/' + yyyy;
  props.setProperty(newDocument.getId() + "creation_date", today);
  Logger.log("Created spreadsheet for " + gameType + " -> " + newDocument.getUrl());
  let infoSheet = newDocument.getSheets()[0].setName("Вводная");
  newDocument.insertSheet("Результаты");
  let teamsSheet = newDocument.insertSheet("Команды");
  let paramsSheet = newDocument.insertSheet("_настройки");

  let infos = [["Это листик для общей информации."],
               ["Эта таблица связана с несколькими скриптами,"+
                "которые проверяют все, что умеют. Для их кор"+
                "ректной работы нужны некоторые ячейки или цв"+
                "ета ячеек. Не меняйте ячейки на листах, назв"+
                "ание которых начинается с нижнего подчеркива"+
                "ния, если не уверены в том, что делаете. Не "+
                "переименовывайте листы."],
               ["Перед игрой нужно зарегестрировать все коман"+
                "ды на листе \"Команды\" (по одной яч"+
                "ейке на команду). После этого на листе\"_настройки\""+
                " в выпадающем списке выбрать \"внести изменен"+
                "ия\" и после этого автоматически будут сгене"+
                "рированны формы, табличка с результатами и та"+
                "бличка с просмотром результатов, которую можн"+
                "о отправить игрокам."],
               ["На листе \"Проверка\" видны все отправленные "+
                "в разные формы ответы. Проверенные автоматиче"+
                "ски выделены зеленым. Непроверенные и требующ"+
                "ие ручной проверки выделены оранжевым."],
               ["Для каждого полученного ответа система пишет "+
                "рядом тот, который вбит в нее как правильный "+
                "ответ. Если он не совпадает с полученным, то "+
                "решение принимать ли ответ принимает проверяю"+
                "щий. Для этого нужно выбрать \"Верно/Неверно\""+
                " в выпадающем списке в ячейке \"вердикт\". Ес"+
                "ли команда повторно отправит ответ на задачу,"+
                " то система его проверять не будет, а пометит"+
                " как повторно отправленный. После этого прове"+
                "ряющий может выбрать проигнорировать эту посы"+
                "лку (\"Пропустить\"), поставить полый балл за з"+
                "адачу (\"Верно\") или поставить ноль за нее (\"Неверно\")."]]
  Logger.log("Added basic description " + infos.length + " cells.");
  infoSheet.getRange(1, 1, infos.length, 1).setValues(infos);
  infoSheet.getRange(1, 1, 10, 5).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);

  let teamExample = [["Названия команд", "В каждом столбце можете указать любое количество команд."+
                     " Каждый столбец соответствует одному варианту. Если вариантов нет, испольуй"+
                     "те один столбец. После внесения изменений не забудьте внести изменения на "+
                     "странице \"настройки\"."],
                     ["Команда 1", "Команда А"],
                     ["Команда 2", "Команда Б"],
                     ["Команда 3", ""]];
  teamsSheet.getRange(1,1,teamExample.length, teamExample[0].length).setValues(teamExample);

  let rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Внести изменения", "Обновлено", "Изменено", "Требуется перезапуск"], true)
    .setAllowInvalid(false).build();
  paramsSheet.getRange(1,2)
    .setValue("Внести изменения")
    .setFontWeight("bold")
    .setDataValidation(rule);
  let yesOrNoRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Да', 'Нет'], true)
    .setAllowInvalid(false).build();
  paramsSheet.getRange(3,2).setDataValidation(yesOrNoRule);
  let params = [["Статус", "Изменено", "Генерация всех необходимых документов может занять 1-2 минуты.", ""],
                ["Название игры", gameName, "", ""],
                ["Собирать email", "Да", "(Этот параметр указывает, требуется ли почта для отправки ответа. "+
                 "Если почта собирается, то меньше шансов, что можно отправить ответ за другую команду.)", ""]];
  paramsSheet.getRange(1, 1, params.length, params[0].length).setValues(params);
  paramsSheet.getRange("A:A").setFontWeight("italic");
  Logger.log("Added basic parameters (" + params.length + " rows)");

  if (gameType == "Карусель") {
    let checkSheet = newDocument.insertSheet("Проверка");
    let headers = ["Время", "Email", "Команда", "Задача", "Ответ", "Вердикт", "Правильный ответ"];
    checkSheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontSize(13)
      .setFontWeight("bold");
    checkSheet.setFrozenRows(1);

    let problemsSheet = newDocument.insertSheet("Задачи");
    problemsSheet.getRange(1, 1, 4, 3).setValues([["Условие", "Правильный ответ", "Ссылка на формы (заполнится автоматически)"],
                                                  ["Здесь условие первой задачи", "Здесь эталонный ответ на первую задачу", ""],
                                                  ["Кирпич весит 2кг и еще полкирпича. Сколько весит кирпич?", "2", ""],
                                                  ["И так далее", "...", ""]]);
    problemsSheet.getRange(1,1,1,3).setFontSize(13)
                                   .setFontWeight("bold");
    problemsSheet.setFrozenRows(1);

    InitializeSequential(newDocument);
    ScriptApp.newTrigger('CheckOnEditSequential')
      .forSpreadsheet(newDocument)
      .onEdit()
      .create();
    ScriptApp.newTrigger('CheckForm')
      .forSpreadsheet(newDocument)
      .onFormSubmit()
      .create();
  } else {
    let newParams = [["Повторная отправка ответа", SECOND_ANSWER_HIDE, "", ""],
                     ["Строки", "Строка 1", "Строка 2", "Строка 3"]];
    if (gameType == GAME_ABAKA) {
      newParams.push(["Столбцы", "Тема 1", "Тема 2", "Тема 3"]);
    } else {
      newParams.push(["Столбцы", "Столбец А", "Столбец Б", "Столбец В"]);
    }
    Logger.log("Added spesial params (" + newParams.length + " rows)");
    let secondAnswerRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([SECOND_ANSWER_HIDE, SECOND_ANSWER_MARK, SECOND_ANSWER_ALLOW], true)
      .setAllowInvalid(false).build();
    paramsSheet.getRange(2 + params.length, 2).setDataValidation(secondAnswerRule);
    paramsSheet.getRange(2 + params.length, 1, newParams.length, newParams[0].length).setValues(newParams);
    InitializeParallel(newDocument);
    ScriptApp.newTrigger('CheckOnEditParallel')
      .forSpreadsheet(newDocument)
      .onEdit()
      .create();
    ScriptApp.newTrigger('CheckNewLine')
      .forSpreadsheet(newDocument)
      .onFormSubmit()
      .create();
  }

  Logger.log("Give permissions to " + emails);
  try {
    newDocument.addEditors(emails);
  } catch (error) {
    Logger.log("Failed to give permissions to users.")
    Logger.log(error);
  }
  let subject = "Таблица для игры " + gameName;
  let body = "Доброго времени суток!\n" + 
             "Создана табличка по вашему запросу.\n" +
             "Ссылка на табличку: " + newDocument.getUrl() + "\n" +
             "Доступ открыт для: " + emails + "\n" +
             "Если это были не вы, проигнорируйте это письмо.\n" +
             "С уважением, автоматика.";
  GmailApp.sendEmail(responceEvent.response.getRespondentEmail(), subject, body);
}
