const vscode = require('vscode');
const axios = require('axios');
const fsLibrary = require('fs');

async function apiSnippets(nameLang) {
    try {
        const apiResponse = await axios.get("https://raw.githubusercontent.com/Eduardo-Barreto/VMRT-sBotics2020/master/" + nameLang + ".json");
        const response = {
            "messsage": "",
            "states": "200",
            "response": apiResponse.data[0]['functions']
        }
        return response;
    } catch (error) {
        //Return Error
        const response = {
            "messsage": "Erro ao fazer request para api!",
            "states": "404",
            "response": ""
        }
        return response;
    }
}

const saveSnippet = (nameLang, snippet) => {
    fsLibrary.writeFile(__dirname + "/snippets/" + nameLang + ".code-snippets", snippet, (erro) => {
        if (erro) {
            console.log("Error" + erro);
        } else {
            console.log("Criado com sucesso!");
        }
    })
}


const jsonToSnippet = (nameLang, json) => {


    var Code = "{";
    for (let i = 0; i < json.length; i++) {
        const e = json[i];
        console.log(e);

        const id = e['id'].toString();
        const name = e['name'].toString();
        const code = e['code'].replace('()', '');
        const description = e['description'].toString();
        const return_type = e['return_type'].toString();
        const type = e['type'].toString();
        const parameters = e['parameters'];

        var Key = [];
        var Value = [];
        Object.entries(parameters).forEach(([key, value]) => {
            Key.push(key);
            Value.push(value);
        });

        Code += `
                "${code}": {
                    "prefix": "${code}",
                    "body": ["${code}(`

        for (let k = 0; k < Key.length; k++) {

            const key = Key[k];
            const value = Value[k];
            const calc = k + 1;

            Code += "${";
            Code += `${calc}:${key}[${value}]`;
            Code += "}, ";


        }
        Code = Code.replace(/,\s*$/, "");
        if (return_type == "Void") {
            Code += `);`;
        } else {
            Code += `)`;
        }
        Code += `",],"description":"${description}"},`;


    }
    Code += "}";
    console.log(Code);
    saveSnippet(nameLang, Code);
};



/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

    console.log('Congratulations, your extension "sbotics-snippets" is now active!');

    var langs = [
        "reduc_en",
        "reduc_pt_BR",
        "csharp",
        "edu"
    ];

    for (let l = 0; l < langs.length; l++) {
        const langPrograming = langs[l];
        const functions = apiSnippets(langPrograming);
        Promise.resolve(functions).then(function (value) {
            const states = value.states;
            const message = value.messsage;
            const response = value.response;

            if (states == "404") {
                vscode.window.showErrorMessage(message);
            } else {
                jsonToSnippet(langPrograming, response);
            }
        }, function (value) {
            vscode.window.showErrorMessage("Ocorreu um erro inesperado!");
        });
    }


}
exports.activate = activate;

function deactivate() { }
exports.deactivate = deactivate;