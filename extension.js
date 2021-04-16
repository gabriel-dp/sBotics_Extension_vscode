const vscode = require("vscode");
const axios = require("axios");
const fsLibrary = require("fs");

const apiSnippets = async (nameLang) => {
    try {
        // @ts-ignore
        const apiResponse = await axios.get(
            "https://sbotics.weduc.natalnet.br/api/snippet/" + nameLang
        );
        const response = {
            states: "OK",
            messsage: "",
            response: apiResponse.data["functions"],
        };
        return response;
    } catch (error) {
        //Return Error
        const response = {
            states: "ERROR",
            messsage: "Error at sBotics API Request",
            response: "",
        };
        return response;
    }
};

const langCount = (all) => {
    var R = 0;
    var C = 0;
    all.map((i) => {
        const lang = i;
        if (lang[0] == "r") R++;
        else C++;
    });
    return [R, C];
};

const saveSnippet = (nameLang, snippet) => {
    fsLibrary.writeFile(
        __dirname + "/snippets/" + nameLang + ".code-snippets",
        snippet,
        (erro) => {
            if (erro) {
                console.log("Error " + erro);
            }
        }
    );
};

var typeMove = [];
var typeRead = [];
var typeWrite = [];
var typeOthers = [];

const jsonGrammars = (word, type) => {
    switch (type) {
        case "Movimentação":
        case "Movement":
            typeMove.push(word);
            break;
        case "Leitura":
        case "Input":
            typeRead.push(word);
            break;
        case "Escrita":
        case "Output":
            typeWrite.push(word);
            break;
        default:
            typeOthers.push(word);
            break;
    }
};

const createGrammars = (sboticsLang, movement, read, write, others) => {
    var grammars = fsLibrary.readFileSync(
        __dirname + "/support/grammars/" + sboticsLang + ".tmLanguage.json",
        "utf8"
    );
    grammars = JSON.parse(grammars);

    var movementStr = "";
    var readStr = "";
    var writeStr = "";
    var othersStr = "";

    //#region
    movement.map((m) => (movementStr += `${m}|`));
    movementStr = movementStr.slice(0, -1);

    read.map((r) => (readStr += `${r}|`));
    readStr = readStr.slice(0, -1);

    write.map((w) => (writeStr += `${w}|`));
    writeStr = writeStr.slice(0, -1);

    others.map((o) => (othersStr += `${o}|`));
    othersStr = othersStr.slice(0, -1);
    //#endregion

    //edit the 4 types of commands
    grammars["repository"]["movement"]["patterns"][0]["match"] =
        "\\b(" + movementStr + ")\\b";
    grammars["repository"]["read"]["patterns"][0]["match"] =
        "\\b(" + readStr + ")\\b";
    grammars["repository"]["write"]["patterns"][0]["match"] =
        "\\b(" + writeStr + ")\\b";
    grammars["repository"]["others"]["patterns"][0]["match"] =
        "\\b(" + othersStr + ")\\b";

    grammars = JSON.stringify(grammars);

    fsLibrary.writeFile(
        __dirname + "/support/grammars/" + sboticsLang + ".tmLanguage.json",
        grammars,
        (erro) => {
            if (erro) {
                console.log("Error " + erro);
            }
        }
    );
};

var sboticsR = 0;
var sboticsC = 0;
var generateGrammar = false;

const jsonToSnippet = (nameLang, json, totalLangs) => {
    var actualLang = "";

    if (nameLang[0] == "r") {
        actualLang = "sboticsR";
        sboticsR++;
        if (sboticsR == totalLangs[0]) {
            generateGrammar = true;
        }
    } else {
        actualLang = "sboticsC";
        sboticsC++;
        if (sboticsC == totalLangs[1]) {
            generateGrammar = true;
        }
    }

    var Code = "{";

    json.map((e) => {
        const id = e["id"].toString();
        const name = e["name"].toString();
        const code = e["code"].replace("()", "");
        const description = e["description"].toString();
        const return_type = e["return_type"].toString();
        const type = e["type"].toString();
        const parameters = e["parameters"];

        jsonGrammars(code, type);

        var d = description.replace(/(\r\n|\n|\r|")/gm, "");

        const keysLenght = Object.keys(parameters).length;

        var Key = [];
        var Value = [];

        for (var p = 0; p < keysLenght; p++) {
            Object.entries(parameters[p]).forEach(([key, value]) => {
                Key.push(key);
                Value.push(value);
            });
        }

        Code += `
                "${code}": {
                    "prefix": "${code}",
                    "body": ["${code}(`;

        for (let k = 0; k < Key.length; k++) {
            const key = Key[k];
            const value = Value[k];
            const calc = k + 1;

            Code += "${";
            Code += `${calc}:${key}[${value}]`;
            Code += "}, ";
        }
        Code = Code.replace(/,\s*$/, "");
        if (return_type == "Void" && nameLang.charAt(0) == "c") {
            Code += `);`;
        } else {
            Code += `)`;
        }
        Code += `",],"description":"${d}"},`;
    });

    //Add default snippets from support
    var defaultSnippets = fsLibrary.readFileSync(
        __dirname + "/support/default/default_" + nameLang + ".json",
        "utf8"
    );
    defaultSnippets = defaultSnippets.substring(1);
    Code += defaultSnippets;

    saveSnippet(nameLang, Code);

    if (generateGrammar) {
        createGrammars(actualLang, typeMove, typeRead, typeWrite, typeOthers);
        typeMove = [];
        typeRead = [];
        typeWrite = [];
        typeOthers = [];
        generateGrammar = false;
    }
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    //Define here the languagues of snippets. Please put first the reduc and then the csharp.
    var langs = [
        "reduc_en",
        "reduc_ptbr",
        "csharp_en",
        "csharp_ptbr"
    ];

    var number = langCount(langs);
    langs.map((l) => {
        const langPrograming = l;
        const functions = apiSnippets(langPrograming);
        Promise.resolve(functions).then(
            (value) => {
                const states = value.states;
                const message = value.messsage;
                const response = value.response;

                if (states == "ERROR") {
                    vscode.window.showErrorMessage(message);
                } else {
                    jsonToSnippet(langPrograming, response, number);
                }
            },
            (value) => {
                vscode.window.showErrorMessage("An unexpected error occurred in the sBotics extension");
            }
        );
    });
}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;