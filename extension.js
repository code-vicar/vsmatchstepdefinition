var vscode = require('vscode');
var fs = require('fs');

var glob = require('glob');

function activate(context) {
    var oc = vscode.window.createOutputChannel('matchStepDefinition');

    var disposable = vscode.commands.registerTextEditorCommand('extension.matchStepDefinition', function (editor) {
        if (!editor) {
            oc.appendLine('no active editor')
            return
        }

        let sourceUri = editor.document.uri
        if (sourceUri.scheme !== 'file') {
            oc.appendLine('active document is not a file on the file system')
            return
        }

        let selection = editor.selection
        let selectedText = editor.document.getText(new vscode.Range(selection.start, selection.end))
        if (selectedText.length === 0) {
            oc.appendLine('no text is selected')
            return
        }

        let config = vscode.workspace.getConfiguration('matchstepdefinition')
        if (!config) {
            oc.appendLine('could not find \'matchstepdefinition\' configuration')
            return
        }

        let stepDefinitions = config.get('step_definitions')
        if (!stepDefinitions) {
            oc.appendLine('could not find \'step_definitions\' configuration')
            return
        }

        let selectedTextMatches = []
        let stepDefFileCount = 0
        let cucumberPatternCount = 0

        let cwd = vscode.workspace.rootPath || process.cwd()
        let stepDefFiles = []
        for (let stepDef of stepDefinitions) {
            stepDefFiles = stepDefFiles.concat(glob.sync(stepDef, {
                cwd: cwd,
                nodir: true,
                absolute: true
            }))
        }

        let regExpExp = /(?:(?:Given|Then|When|And|But).*?)(\/.+?\/)+/g

        for (let stepDefFile of stepDefFiles) {
            stepDefFileCount++
            let cucumberPatternMatches = []
            let stepDefFileContents = fs.readFileSync(stepDefFile, 'utf-8')

            let myArray = []
            while ((myArray = regExpExp.exec(stepDefFileContents)) !== null) {
                cucumberPatternMatches.push(myArray[1])
            }

            if (cucumberPatternMatches && cucumberPatternMatches.length > 0) {
                for (let cucumberPattern of cucumberPatternMatches) {
                    cucumberPatternCount++
                    let reg = new RegExp(cucumberPattern.slice(1, -1))
                    if (reg.test(selectedText)) {
                        selectedTextMatches.push({
                            file: stepDefFile,
                            withReg: reg
                        })
                    }
                }
            }
        }

        if (selectedTextMatches.length > 0) {
            oc.appendLine(`Found ${ selectedTextMatches.length } matches`)
            oc.appendLine(`Opening first match in file: ${ selectedTextMatches[0].file } with RegExp ${ selectedTextMatches[0].withReg }`)
            vscode.workspace.openTextDocument(selectedTextMatches[0].file).then((doc) => {
                vscode.window.showTextDocument(doc)
            })
        } else {
            oc.appendLine(`Did not find match`)
        }

        oc.appendLine(`Searched ${cucumberPatternCount} patterns accross ${stepDefFileCount} files`)
    });

    context.subscriptions.push(oc);
    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;
