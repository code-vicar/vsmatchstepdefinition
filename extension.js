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

        let stepDefFileCount = 0
        let regexCount = 0

        let cwd = vscode.workspace.rootPath || process.cwd()
        let stepDefFiles = []
        for (let stepDef of stepDefinitions) {
            stepDefFiles = stepDefFiles.concat(glob.sync(stepDef, {
                cwd: cwd,
                nodir: true,
                absolute: true
            }))
        }

        let stepDefFileContents = ''
        let matches = []
        let foundMatch
        let withRegex
        for (let stepDefFile of stepDefFiles) {
            let regExpExp = /(?:(?:Given|Then|When|And|But).*?)(\/.+?\/)+/g
            stepDefFileCount++
            stepDefFileContents = fs.readFileSync(stepDefFile, 'utf-8')
            
            let myArray = []
            while ((myArray = regExpExp.exec(stepDefFileContents)) !== null) {
                matches.push(myArray[1])
            }

            if (matches && matches.length > 0) {
                for (let match of matches) {
                    regexCount++
                    let reg = new RegExp(match.slice(1, -1))
                    if (reg.test(selectedText)) {
                        foundMatch = stepDefFile
                        withRegex = reg
                        break;
                    }
                }
            }

            if (foundMatch) { break }
        }

        if (foundMatch) {
            oc.appendLine(`Found match: ${ foundMatch } with RegExp ${ withRegex }`)
            vscode.workspace.openTextDocument(foundMatch).then((doc) => {
                vscode.window.showTextDocument(doc)
            })
        } else {
            oc.appendLine(`Did not find match`)
        }

        oc.appendLine(`Searched ${regexCount} patterns accross ${stepDefFileCount} files`)
    });

    context.subscriptions.push(oc);
    context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;