var GAME_ABAKA = "Абака";
var GAME_ABAKA_TRANSPOSED = "\"Транспонированная\" Абака";
var GAME_KARUSEL = "Карусель";
var GAME_KRESTIKI = "Крестики-нолики";

var SECOND_ANSWER_HIDE = "Не засчитывать и скрывать";
var SECOND_ANSWER_MARK = "Не засчитывать и помечать";
var SECOND_ANSWER_ALLOW = "Проверять так же как первую отправку";

var MAX_RUNNING_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
var REASONABLE_TIME_TO_WAIT = 10 * 1000; // 10 seconds in milliseconds


function Manually() {
  // let id = "1ShwRjk8e8MzZ2huFqV7AthBukkni1AoUU9kR7NLDwZc";
  // AbandonDocumentAndClear(id);
  BackgroundSheetManager();
}

function LaunchInitManually() {
  let id = "19_3bzwSmXNqczLV_r7-pNTvOnJQb_fAQe20-be5OVD0";
  let document = SpreadsheetApp.openById(id);
  InitializeParallel(document);
}

function ClearProperties() {
  PropertiesService.getScriptProperties().deleteAllProperties();
}

function LogProperties() {
  let keys = PropertiesService.getScriptProperties().getKeys();
  let properties = PropertiesService.getScriptProperties().getProperties();
  for (let key of keys) {
      Logger.log("Property " + key + " = " + properties[key]);
  }
}

function LogDocuments() {
  let keys = PropertiesService.getScriptProperties().getKeys();
  let properties = PropertiesService.getScriptProperties().getProperties();
  for (let key of keys) {
    if (properties[properties[key] + "creation_date"]) {
      let created_at = properties[properties[key] + "creation_date"];
      Logger.log("Property " + key + " = " + properties[key]);
      Logger.log( properties[key] + " created at " + created_at);
    }
  }
}

function DeleteTimeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (let trigger of triggers) {
    if (trigger.getEventType() == ScriptApp.EventType.CLOCK) {
      Logger.log("Deleting trigger " + trigger.getUniqueId());
      ScriptApp.deleteTrigger(trigger);
    }
  }
}

function AbandonDocumentAndClear(documentId) {
  var triggers = ScriptApp.getProjectTriggers();
  for (let trigger of triggers) {
    if (trigger.getTriggerSourceId() == documentId) {
      Logger.log("Deleting trigger " + trigger.getUniqueId());
      ScriptApp.deleteTrigger(trigger);
    }
  }
  let keys = PropertiesService.getScriptProperties().getKeys();
  for (let key of keys) {
    if (key.includes(documentId) || key.startsWith("document") && PropertiesService.getScriptProperties().getProperty(key) == documentId) {
      Logger.log("Deleting property " + key);
      PropertiesService.getScriptProperties().deleteProperty(key);
    }
  }
}

function DeleteSpreadsheetTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (let trigger of triggers) {
    if (trigger.getTriggerSource() == ScriptApp.TriggerSource.SPREADSHEETS) {
        ScriptApp.deleteTrigger(trigger);
    }
  }
}

function HideFormAnswerSheets(document) {
  const part = "Ответы на форму";
  for (let sheet of document.getSheets()) {
    if (sheet.getName().substring(0, part.length) == part) {
      sheet.hideSheet();
      Logger.log("Hidden sheet " + sheet.getName());
    }
  }
}

function ReadTeams(sheet) {
  let columns = sheet.getLastColumn();
  let rows = sheet.getLastRow();
  let range = sheet.getRange(2, 1, rows - 1, columns);
  let values = range.getValues();
  range.setNotes(values.map(row => row.map(_ => null)))
    .setBackground("#FFFFFF")
    .setNumberFormat("@");
  let groups = [];
  let namesPool = new Set();
  for (let columnIndex = 0; columnIndex < columns; ++columnIndex) {
    group = [];
    for (let rowIndex = 0; rowIndex < rows - 1; ++rowIndex) {
      let name = String(values[rowIndex][columnIndex]).trim();
      if (name == "") {
        continue;
      }
      if (namesPool.has(name)) {
        sheet.getRange(2 + rowIndex, 1 + columnIndex)
          .setBackground("#FF0000")
          .setNote("Название команды повторилось");
      } else {
        group.push(name);
        namesPool.add(name);
      }
    }
    if (group.length > 0) {
      groups.push(group);
    }
  }
  Logger.log("Teams are " + groups);
  return groups;
}

function IsInteger(str) {
  if (str == "0" || str == "-0") {
    return true;
  }
  return /^-?[1-9]\d*$/.test(str);
}

function Test() {
  for (let n of ["0", "012", "3/04", "3./4", "12//3", "242,.4", "123.", "1/3","2,02","5.32", "-43.3", "--5.3", "12:3", "dc-fw3", "-2/3d", "0/00", "-3,2", "-0,125"]) {
    let frac = StringToFraction(n);
    let str;
    if (frac == null) {
      str = "null";
    } else {
      str = "" + frac.numerator + "/" + frac.denominator;
    }
    Logger.log(n + " -> "  + str + "  ( test says " + IsFraction(n) + ")");
  }
}

function IsFraction(str) {
  if (IsInteger(str)) {
    return true;
  }
  return /^-?\d+[,.\/:]\d+$/.test(str);
}

function StringToFraction(str) {
  if (IsInteger(str)) {
    let fraction = Object();
    fraction.numerator = Number(str);
    fraction.denominator = 1;
    return fraction;
  }
  let decimalPointPosition = str.search(/[,.]/);
  if (decimalPointPosition > 0) {
    if (!IsInteger(str.substring(0, decimalPointPosition)) || !/^\d+$/.test(str.substring(decimalPointPosition + 1))) {
      return null;
    }
    let fraction = Object();
    let integerPart = Number(str.substring(0, decimalPointPosition));
    let fractionPart = Number(str.substring(decimalPointPosition + 1));
    let power = str.length - decimalPointPosition - 1;
    fraction.numerator = integerPart * (10 ** power) + (integerPart > 0 ? 1 : -1) * fractionPart;
    fraction.denominator = 10 ** power;
    return fraction;
  }
  let devisionPosition = str.search(/[\/:]/);
  if (devisionPosition > 0) {
    if (!IsInteger(str.substring(0, devisionPosition)) || !IsInteger(str.substring(devisionPosition + 1))) {
      return null;
    }
    let fraction = Object();
    fraction.numerator = Number(str.substring(0, devisionPosition));
    fraction.denominator = Number(str.substring(devisionPosition + 1));
    return fraction;
  }
  return null;
}

function MeasureLoggingTime() {
  let start = Date.now();
  let times = 10000;
  for (let i = 0; i < times; ++i) {
    Logger.log("Message #" + i);
  }
  end = Date.now();
  Logger.log("Execution took " + (end - start) + "ms, avg = " + ((end-start) / times) + "ms");
  // Execution took 10240ms, avg = 1.024ms
}

function MeasureGetPropertiesFullTime() {
  let start = Date.now();
  let times = 1000;
  for (let i = 0; i < times; ++i) {
    PropertiesService.getScriptProperties().getProperty("dummy");
  }
  end = Date.now();
  Logger.log("Execution took " + (end - start) + "ms, avg = " + ((end-start) / times) + "ms");
  // Execution took 47471ms, avg = 47.471ms
}

function MeasureGetPropertyLightTime() {
  props = PropertiesService.getScriptProperties();
  let start = Date.now();
  let times = 1000;
  for (let i = 0; i < times; ++i) {
    props.getProperty("dummy");
  }
  end = Date.now();
  Logger.log("Execution took " + (end - start) + "ms, avg = " + ((end-start) / times) + "ms");
  // Execution took 39774ms, avg = 39.774ms
}

function MeasureGetPropertiesAllTime() {
  let start = Date.now();
  let properties = PropertiesService.getScriptProperties().getProperties();
  let times = 1000;
  for (let i = 0; i < times; ++i) {
    properties['dummy'];
  }
  end = Date.now();
  Logger.log(properties.length);
  Logger.log("Execution took " + (end - start) + "ms, avg = " + ((end-start) / times) + "ms");
  // Execution took 53ms, avg = 0.053ms
}

function TestHttp() {
  const url = 'https://x.x.x.x:xxx';
  let data = {"name": "mark-2"}
  let options = {
    'method': 'POST', // or 'GET', 'PUT', etc.
    'contentType': 'application/json', // adjust accordingly
    'payload': JSON.stringify(data), // adjust data as needed
    'validateHttpsCertificates': false,
  };
  var response = UrlFetchApp.fetch(url, options, );
  Logger.log(response);
}

function SetPropManually() {
  let documentId = "19_3bzwSmXNqczLV_r7-pNTvOnJQb_fAQe20-be5OVD0";
  // PropertiesService.getScriptProperties().setProperty("LinesCheckerIndex", 2);
  PropertiesService.getScriptProperties().setProperty(documentId + "gameType", GAME_ABAKA_TRANSPOSED);
}
