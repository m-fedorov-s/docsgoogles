function CreateSequentialViewer(document) {
  const documentId = document.getId();
  let viewer;
  let resultsId = PropertiesService.getScriptProperties().getProperty(documentId + "viewResultsId");
  if (resultsId == null) {
    viewer = SpreadsheetApp.create("Результаты игры");
    PropertiesService.getScriptProperties().setProperty(documentId + "viewResultsId", viewer.getId());
    viewer.getSheets()[0].setName("Результаты");
    Logger.log("Создана табличка для просмотра: " + viewer.getUrl());
  } else {
    viewer = SpreadsheetApp.openById(resultsId);
    Logger.log("Найдена табличка для просмотра: " + viewer.getId());
  }
  let file = DriveApp.getFileById(viewer.getId());
  // Set sharing parameters so ANYONE can VIEW this spreadsheet
  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
  document.getSheetByName("Вводная").getRange(1, 3, 1, 2).setValues([["Просмотр результатов: ", viewer.getUrl()]]);
  Logger.log("Creater viewer table.")
  return viewer;
}

function ReadDataSequential(document) {
  let result = {};
  const data = document.getSheetByName("_настройки").getDataRange().getValues();
  result["teams"] = []
  result["groups"] = ReadTeams(document.getSheetByName("Команды"));
  for (let i = 0; i < data.length; ++i) {
    const line = data[i];
    if (line[0] == "Количество команд") {
      let teamsCount = Number(line[1]);
      for (let i = 1; i < teamsCount + 1; ++i) {
        result["teams"].push("Команда" + i);
      }
      Logger.log("Got " + result["teams"].length + " teams");
    } else if (line[0] == "Название игры") {
      result["gameName"] = line[1];
    } else if (line[0] == "Собирать email") {
      result["collectMails"] = (line[1] == "Да");
    }
  }
  result["teams"].sort();
  Logger.log("Считаны данные.");
  return result;
}

function ReadProblems(document) {
  let list = document.getSheetByName("Задачи");
  if (list == null) {
    Logger.log("Failed to find list with problems.");
    return [];
  }
  if (list.getLastRow() < 2) {
    Logger.log("No problems found.");
    return [];
  }
  let data = list.getRange(2, 1, list.getLastRow() - 1, 1).getValues().flat();
  Logger.log("Got " + data.length + " problems");
  return data;
}

function CreateIndividualForms(problems, viewLink, textValidation, document) {
  const documentId = document.getId();
  let reversedProblems = problems.reverse();
  let formIndex = problems.length - 1;
  let nextLink = null;
  let forms = [];
  for (let problemText of reversedProblems) {
    let formId = PropertiesService.getScriptProperties().getProperty(documentId + "formId" + formIndex);
    let form;
    if (formId == null) {
      form = FormApp.create("Задача " + (formIndex + 1)).setCollectEmail(false);
      form.setDescription("Вы можете отправить форму несколько раз, чтобы снова получить ссылку на форму со следующей задачей. Будет проверен только первый ответ, который вы отправите.");
      form.addTextItem()
        .setTitle('Ваша команда:')
        .setRequired(true)
        .setValidation(textValidation);
      form.addTextItem()
        .setRequired(true);
      form.setDestination(FormApp.DestinationType.SPREADSHEET, document.getId());
      Logger.log("Created form " + formId);
    } else {
      Logger.log("Found form " + formId);
      form = FormApp.openById(formId);
    }
    PropertiesService.getScriptProperties().setProperty(documentId + form.getId(), formIndex);
    PropertiesService.getScriptProperties().setProperty(documentId + "formId" + formIndex, form.getId());
    form.setTitle("Задача " + (formIndex + 1));
    form.getItems()[0].asTextItem().setValidation(textValidation);
    form.getItems()[1].setTitle(problemText);
    if (nextLink == null) {
      form.setConfirmationMessage("Ответ на задачу принят. Эта задача последняя.\nМожно посмотреть результаты по ссылке: " + viewLink);
    } else {
      form.setConfirmationMessage("Ответ на задачу принят. Ссылка на следующую задачу: " + nextLink + "\nМожно посмотреть результаты по ссылке: " + viewLink);
    }
    nextLink = form.shortenFormUrl(form.getPublishedUrl());
    forms.push(form);
    formIndex--;
  }
  return forms.reverse()
}

function RenameFormsSheets(document) {
  const documentId = document.getId();
  let properties = PropertiesService.getScriptProperties().getProperties();
  for (let sheet of document.getSheets()) {
    Logger.log("Url is " + sheet.getFormUrl());
    if (sheet.getFormUrl() != null) {
      let form = FormApp.openByUrl(sheet.getFormUrl());
      let index = properties[documentId + form.getId()];
      if (index != null) {
        Logger.log("Rename to " + Number(index) + 1);
        sheet.setName(Number(index) + 1);
        sheet.hideSheet();
      }
    }
  }
}

function InitializeSequential(document) {
  const documentId = document.getId();
  DeleteHidden(document);
  let dataObject = ReadDataSequential(document);
  let teams = dataObject.teams;
  for (let group of dataObject.groups) {
    teams = teams.concat(group);
  }
  teams.sort();

  let viewer = CreateSequentialViewer(document);

  let problems = ReadProblems(document);
  var textValidation = FormApp.createTextValidation()
    .setHelpText('Название команды не найдено. Регистр букв и пробелы важны!')
    .requireTextMatchesPattern("(" + teams.join("|") + ")")
    .build();
  let forms = CreateIndividualForms(problems, viewer.getUrl(), textValidation, document);
  // Now store all form links to the page with problems
  let formLinks = forms.map(f => [f.shortenFormUrl(f.getPublishedUrl())]);
  document.getSheetByName("Задачи").getRange(2, 3, formLinks.length, 1).setValues(formLinks);
  document.getSheetByName("Вводная").getRange(3, 3, 1, 2).setValues([["Ссылка на первую форму:", formLinks[0][0]]]);

  let rawResultList = document.getSheetByName("_результаты");
  if (rawResultList == null) {
    rawResultList = document.insertSheet();
    rawResultList.setName("_результаты");
  }
  // rawResultList.clear();
  rawResultList.hideSheet();

  let resultList = document.getSheetByName("Результаты");
  resultList.clear();
  if (problems.length > 0) {
    resultList.getRange(1, 2, 1, problems.length).setValues([[...Array(problems.length).keys()].map(i => i+1)]).setFontWeight("bold");
    resultList.getRange(1, problems.length + 2).setValue("Сумма").setFontWeight("bold");
  }
  resultList.getRange(1, 1).setValue("Команда/Задача").setFontWeight("bold");
  if (teams.length > 0) {
    resultList.getRange(2, 1, teams.length, 1).setValues(teams.map(it => [it])).setFontWeight("bold");
    resultList.getRange(2, 2, teams.length, problems.length).setFormulaR1C1("if(isblank('_результаты'!R[0]C[0]); ; if('_результаты'!R[0]C[-1]; (R[0]C[-1] + 1) * '_результаты'!R[0]C[0]; 3 * '_результаты'!R[0]C[0]))");
    resultList.getRange(2, 2 + problems.length, teams.length, 1).setFormulaR1C1("sum(R[0]C[-" + problems.length + "]:R[0]C[-1])");
  }
  resultList.autoResizeColumns(1, 2 + problems.length);

  viewer.getSheets()[0].getRange(1, 1)
    .setFormula('=IMPORTRANGE("' + document.getId() + '"; "\'Результаты\'!A1:AA' + teams.length + 2 + '")');

  let teamMap = {};
  for (let index = 0; index < teams.length; ++index) {
    teamMap[documentId + teams[index]] = index;
  }
  RenameFormsSheets(document);
  PropertiesService.getScriptProperties().setProperties(teamMap);
}
